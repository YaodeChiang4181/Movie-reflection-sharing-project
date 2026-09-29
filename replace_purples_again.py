import os
import re

directory = 'c:/Users/09664/Desktop/個人專案群/映後時光專案/frontend/src'

replacements = {
    r'(?i)#a855f7': '#e0a03a',
    r'(?i)#7c3aed': '#c98c2e',
    r'(?i)#5A4BDB': '#c98c2e',
    r'(?i)#a29bfe': '#e0a03a',
    r'(?i)rgba\(\s*108\s*,\s*92\s*,\s*231': 'rgba(224, 160, 58',
    r'(?i)rgba\(\s*124\s*,\s*58\s*,\s*237': 'rgba(201, 140, 46',
    r'(?i)rgba\(\s*168\s*,\s*85\s*,\s*247': 'rgba(224, 160, 58',
}

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        for pattern, replacement in replacements.items():
            new_content = re.sub(pattern, replacement, new_content)
            
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(('.css', '.jsx', '.js', '.ts', '.tsx')):
            replace_in_file(os.path.join(root, file))

print("Done replacing purples.")
