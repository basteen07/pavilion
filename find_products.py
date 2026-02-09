import os
import json

root_dir = r'c:\Users\dfuser\Desktop\Pavilion Structure (Document & Images)'
found_products = []

for root, dirs, files in os.walk(root_dir):
    docx_files = [f for f in files if f.lower().endswith('.docx')]
    if docx_files:
        # Check for images in the same folder
        image_files = [f for f in files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        # Identify path components for Category/Sub-Category
        relative_path = os.path.relpath(root, root_dir)
        path_parts = relative_path.split(os.sep)
        
        for docx in docx_files:
            found_products.append({
                'root': root,
                'docx': docx,
                'images': image_files,
                'path_parts': path_parts
            })

output_file = 'found_products.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(found_products, f, indent=4)

print(f"Found {len(found_products)} products. Details saved to {output_file}")
