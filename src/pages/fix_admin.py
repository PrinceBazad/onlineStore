import re
with open("Admin.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Find and replace the old image upload section
pattern = r"""<div className="image-upload-section">
                <label>Product image — URL
                  <input
                    value=\{form\.customImage\.startsWith\('data:'\) \? '' : form\.customImage\}
                    onChange=\{\(e\) => setForm\(\{ \.\.\.form, customImage: e\.target\.value \}\)\}
                    placeholder="https://example\.com/image\.jpg"
                  />
                  <span className="muted tiny">Paste any image URL\. Upload a file below to auto-replace it\.</span>
                </label>
                <div className="image-upload-or">OR</div>
                <label className="image-upload-btn">
                  <input type="file" accept="image/\*" onChange=\{handleImageUpload\} style=\{\{ display: 'none' \}\} />
                  <span>📁 Upload photo from device</span>
                </label>
                \{form\.customImage && form\.customImage\.trim\(\) !== '' && \(
                  <div className="image-preview-row">
                    <img src=\{form\.customImage\} alt="Preview" className="image-preview-thumb" />
                    <button type="button" className="btn btn-ghost btn-sm" onClick=\{clearCustomImage\}>✕ Remove</button>
                  </div>
                \)\}
              </div>"""

print("Searching for pattern...")
if re.search(pattern, content):
    print("Found! Replacing...")
else:
    print("Pattern not found")
