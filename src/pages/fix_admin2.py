import re
with open("Admin.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the line numbers to replace
start_line = None
end_line = None
for i, line in enumerate(lines):
    if "<div className=\"image-upload-section\">" in line:
        start_line = i
    if start_line and "</div>" in line and i > start_line + 5:
        # Check if next non-empty line has grid3
        for j in range(i+1, min(i+5, len(lines))):
            if "grid3" in lines[j]:
                end_line = i
                break
        if end_line:
            break

print(f"Found section at lines {start_line+1} to {end_line+1}")
if start_line and end_line:
    new_section = """                <label>Product images (up to 5)
                  <span className="muted tiny">Upload up to 5 images. First image will be the main image.</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={form.customImages.length >= 5}
                />
                {form.customImages.length > 0 && (
                  <div className="img-preview-grid">
                    {form.customImages.map((img, idx) => (
                      <div key={idx} className="img-preview-item">
                        <img src={img} alt={`Preview ${idx + 1}`} />
                        {idx === 0 && <span className="img-badge">Main</span>}
                        <button type="button" className="btn btn-sm danger remove-img" onClick={() => removeImage(idx)}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label>Or paste image URL
                  <input
                    onBlur={(e) => {
                      const url = e.target.value.trim();
                      if (url && (url.startsWith(\"http\") || url.startsWith(\"data:\"))) {
                        setForm({ ...form, customImages: [...form.customImages, url] });
                        e.target.value = "";
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.target.blur();
                      }
                    }}
                    placeholder="https://example.com/image.jpg — press Enter to add"
                  />
                </label>
"""
    new_lines = lines[:start_line] + [new_section] + lines[end_line+1:]
    with open("Admin.jsx", "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    print("File updated successfully!")
else:
    print("Section not found")

