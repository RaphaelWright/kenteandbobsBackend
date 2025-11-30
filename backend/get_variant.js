const fs = require('fs');
try {
    // PowerShell redirection often creates UTF-16LE files
    let content = fs.readFileSync('products.json', 'utf16le');
    // If it's not valid JSON, it might be because of BOM or it was actually UTF-8
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

    try {
        const data = JSON.parse(content);
        if (data.products && data.products.length > 0 && data.products[0].variants && data.products[0].variants.length > 0) {
            console.log(data.products[0].variants[0].id);
        } else {
            console.log("No variants found");
        }
    } catch (e) {
        // Try UTF-8
        content = fs.readFileSync('products.json', 'utf8');
        const data = JSON.parse(content);
        if (data.products && data.products.length > 0 && data.products[0].variants && data.products[0].variants.length > 0) {
            console.log(data.products[0].variants[0].id);
        } else {
            console.log("No variants found");
        }
    }
} catch (e) {
    console.log("Error:", e.message);
}
