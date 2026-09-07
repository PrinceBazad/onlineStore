with open("Admin.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix: Close the button and conditional properly
content = content.replace(
    "                  </button>\n              </div>",
    "                  </button>\n                )}\n              </div>"
)

with open("Admin.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed!")
