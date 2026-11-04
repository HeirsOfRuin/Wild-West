# Rewrite an APK so resources.arsc (and anything else stored) is uncompressed and
# 4-byte aligned, as Android 11+ requires for apps targeting API 30+. Everything
# else is deflated. Usage: python3 -I align.py in.apk out.apk
import sys, zipfile
src, dst = sys.argv[1], sys.argv[2]
STORE = {'resources.arsc'}
with zipfile.ZipFile(src) as zin, open(dst, 'wb') as raw:
    zout = zipfile.ZipFile(raw, 'w')
    for info in zin.infolist():
        data = zin.read(info.filename)
        new = zipfile.ZipInfo(info.filename, date_time=(2026, 1, 1, 0, 0, 0))
        new.external_attr = info.external_attr
        if info.filename in STORE or info.filename.endswith('.png'):
            new.compress_type = zipfile.ZIP_STORED
            # local header = 30 bytes + name + extra; pad extra so data starts on 4 bytes
            off = raw.tell() + 30 + len(info.filename.encode())
            pad = (4 - off % 4) % 4
            new.extra = b'\0' * pad
        else:
            new.compress_type = zipfile.ZIP_DEFLATED
        zout.writestr(new, data)
    zout.close()
with zipfile.ZipFile(dst) as z, open(dst, 'rb') as f:
    for i in z.infolist():
        if i.compress_type == zipfile.ZIP_STORED:
            f.seek(i.header_offset + 26); n, e = int.from_bytes(f.read(2), 'little'), int.from_bytes(f.read(2), 'little')
            start = i.header_offset + 30 + n + e
            assert start % 4 == 0, f'{i.filename} not aligned'
print('aligned', dst)
