import re, os

emoji_pattern = re.compile(r'[\U00010000-\U0010ffff\u2600-\u27bf\u2300-\u23ff\u2b50-\u2b55\u200d\ufe0f]')
base_dir = 'api/integrations/line'

total_emojis = 0
for root, _, files in os.walk(base_dir):
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as fp:
                for idx, line in enumerate(fp, 1):
                    emojis = emoji_pattern.findall(line)
                    if emojis:
                        total_emojis += len(emojis)
                        safe = line.strip()[:80].encode('ascii', 'backslashreplace').decode('ascii')
                        print(f"{path}:{idx}: {[hex(ord(c)) for c in emojis]} -> {safe}")

print(f"Total emojis found: {total_emojis}")
