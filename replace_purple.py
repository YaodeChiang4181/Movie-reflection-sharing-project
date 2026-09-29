import os
import re

directory = 'c:/Users/09664/Desktop/個人專案群/映後時光專案/frontend/src'

replacements = {
    r'rgba\(\s*139\s*,\s*92\s*,\s*246': 'rgba(224, 160, 58',
    r'#8B5CF6': '#e0a03a',
    r'#6D28D9': '#c98c2e',
    r'#C084FC': '#fcd584',
    r'#C4B5FD': 'var(--text-secondary)',
    r'#DDD6FE': 'var(--text-primary)',
    r'rgba\(\s*167\s*,\s*139\s*,\s*250': 'rgba(224, 160, 58',
    r'rgba\(\s*110\s*,\s*86\s*,\s*207': 'rgba(224, 160, 58',
    r'#D8B4FE': 'var(--accent-primary)',
    r'rgba\(\s*168\s*,\s*85\s*,\s*247': 'rgba(224, 160, 58',
    r'#6C5CE7': '#e0a03a',
    r'#8E52F5': '#e0a03a',
    r'#a78bfa': '#e0a03a',
    r'#A78BFA': '#e0a03a'
}

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(('.css', '.jsx')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            for pattern, repl in replacements.items():
                content = re.sub(pattern, repl, content, flags=re.IGNORECASE)
                
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Updated {filepath}")
