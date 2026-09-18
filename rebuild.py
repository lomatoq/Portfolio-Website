#!/usr/bin/env python3
"""Repack editable sources into the offline, single-file index.html (Python 3.9+)."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent

def main() -> None:
    page = ROOT / 'index.html'
    text = page.read_text(encoding='utf-8')
    count = 0
    pattern = re.compile(r'(<(script|style)\b[^>]*data-nocturne-source="([^"]+)"[^>]*>)(.*?)(</\2>)', re.S)
    def pack(m: re.Match) -> str:
        nonlocal count
        source = (ROOT / m.group(3)).resolve()
        if ROOT not in source.parents:
            raise ValueError('Source path escapes project directory')
        content = source.read_text(encoding='utf-8')
        if re.search(r'</' + m.group(2) + r'\s*>', content, re.I):
            raise ValueError(f'Unsafe closing tag inside {source.name}')
        count += 1
        return m.group(1) + '\n' + content.rstrip() + '\n' + m.group(5)
    result = pattern.sub(pack, text)
    if count != 25:
        raise ValueError(f'Expected 25 source blocks, found {count}; index.html was not overwritten')
    tmp = page.with_suffix('.tmp')
    tmp.write_text(result, encoding='utf-8')
    tmp.replace(page)
    print(f'Rebuilt index.html: {count} source blocks, {page.stat().st_size:,} bytes')

if __name__ == '__main__':
    main()
