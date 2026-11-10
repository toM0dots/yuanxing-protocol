"""Read packed Blender mesh datablocks without executing embedded scripts."""
import re, struct
from pathlib import Path

class Blend:
    def __init__(self, path):
        data = Path(path).read_bytes()
        if not data.startswith(b'BLENDER'):
            import zstandard
            with zstandard.ZstdDecompressor().stream_reader(data) as stream:
                data = stream.read()
        assert data[:7] == b'BLENDER' and data[7:9] == b'-v', 'Expected 64-bit little-endian blend'
        self.data, self.blocks, self.by_addr = data, [], {}
        at = 12
        while at + 24 <= len(data):
            code, size, addr, dna, count = struct.unpack_from('<4sIQII', data, at)
            block = dict(code=code.rstrip(b'\0').decode(), size=size, addr=addr, dna=dna, count=count, offset=at+24)
            self.blocks.append(block)
            self.by_addr[addr] = block
            at += 24 + size
        dna = next(b for b in self.blocks if b['code'] == 'DNA1')
        d = data[dna['offset']:dna['offset']+dna['size']]
        assert d[:8] == b'SDNANAME'
        p = 8
        def strings():
            nonlocal p
            count, = struct.unpack_from('<I', d, p); p += 4
            result = []
            for _ in range(count):
                q = d.index(0, p); result.append(d[p:q].decode()); p = q+1
            p = (p+3)//4*4
            return result
        self.names = strings()
        assert d[p:p+4] == b'TYPE'; p += 4
        self.types = strings()
        assert d[p:p+4] == b'TLEN'; p += 4
        self.lengths = struct.unpack_from('<'+'H'*len(self.types), d, p); p += len(self.types)*2; p = (p+3)//4*4
        assert d[p:p+4] == b'STRC'; p += 4
        count, = struct.unpack_from('<I', d, p); p += 4
        self.structs, self.layouts = [], {}
        for _ in range(count):
            tid, n = struct.unpack_from('<HH', d, p); p += 4
            fields, off = {}, 0
            for _ in range(n):
                t, ni = struct.unpack_from('<HH', d, p); p += 4
                raw = self.names[ni]; dims = [int(v) for v in re.findall(r'\[(\d+)\]', raw)]
                length = 1
                for v in dims: length *= v
                pointer = '*' in raw
                key = re.sub(r'\[.*', '', raw).lstrip('*')
                fields[key] = dict(type=self.types[t], offset=off, length=length, pointer=pointer, raw=raw)
                off += (8 if pointer else self.lengths[t])*length
            name = self.types[tid]
            assert off == self.lengths[tid], (name, off, self.lengths[tid])
            self.structs.append(name); self.layouts[name] = (fields, off)
    def object(self, addr, type=None):
        if not addr: return None
        b = self.by_addr[addr]
        return Struct(self, b['offset'], type or self.structs[b['dna']])
    def array(self, addr, fmt, count):
        b = self.by_addr[addr]
        return struct.unpack_from('<'+fmt*count, self.data, b['offset'])
    def objects(self, code):
        return [self.object(b['addr']) for b in self.blocks if b['code'] == code]

class Struct:
    def __init__(self, blend, offset, type):
        self.blend, self.offset, self.type = blend, offset, type
    def get(self, key):
        b = self.blend; f = b.layouts[self.type][0][key]; p = self.offset+f['offset']; n=f['length']; t=f['type']
        if f['pointer']: return struct.unpack_from('<'+'Q'*n,b.data,p)[0] if n==1 else struct.unpack_from('<'+'Q'*n,b.data,p)
        primitive = {'char':'b','uchar':'B','short':'h','ushort':'H','int':'i','unsigned int':'I','int64_t':'q','uint64_t':'Q','float':'f','double':'d','bool':'?'}
        if t=='char' and n>1: return b.data[p:p+n].split(b'\0')[0].decode(errors='replace')
        if t in primitive:
            values=struct.unpack_from('<'+primitive[t]*n,b.data,p); return values[0] if n==1 else values
        if n>1: return [Struct(b,p+i*b.layouts[t][1],t) for i in range(n)]
        return Struct(b,p,t)
    def ptr(self,key,type=None): return self.blend.object(self.get(key),type)
    def name(self): return self.get('id').get('name')[2:]
    def fields(self): return list(self.blend.layouts[self.type][0])
