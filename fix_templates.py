#!/usr/bin/env python3
import re

# Files to fix
files = ['content.js', 'options.js', 'background.js']

# Template to remove (the 4th one)
template_to_remove = '"Hello {firstName}, I just graduated in CS and have built scalable web & mobile applications. I\'d be happy to connect and learn more about roles you\'re hiring for."'

for filename in files:
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the recruiterTemplates array and remove the 4th template
        # Pattern to match the 4th template with its comma
        pattern = r',\s*"Hello \{firstName\}, I just graduated in CS and have built scalable web & mobile applications\. I'd be happy to connect and learn more about roles you're hiring for\."'
        
        if pattern in content:
            print(f"Found pattern in {filename}")
            new_content = re.sub(pattern, '', content)
            
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed {filename}")
        else:
            print(f"Pattern not found in {filename}")
            
    except FileNotFoundError:
        print(f"File {filename} not found")
    except Exception as e:
        print(f"Error processing {filename}: {e}")

print("Template fix complete!")
