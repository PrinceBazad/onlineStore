with open("Admin.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix: Add opening div tag
content = content.replace(
    "                <label>Product images (up to 5)",
    "              <div className=\"image-upload-section\">\n                <label>Product images (up to 5)"
)

# Fix: Remove extra ")}" and closing div
content = content.replace(
    "                )}\n              </div>",
    "              </div>"
)

with open("Admin.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed!")
