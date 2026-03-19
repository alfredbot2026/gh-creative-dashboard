import DOMPurify from 'isomorphic-dompurify';

const dirty = '## Title\nThis is some **text** with a <script>alert("xss")</script> malicious script!';

const html = dirty
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');

const clean = DOMPurify.sanitize(html);

console.log("Original:", dirty);
console.log("Sanitized HTML:", clean);
if (!clean.includes('<script>')) {
    console.log("SUCCESS: <script> tag was successfully stripped!");
} else {
    console.log("FAILED: <script> tag is still present.");
}
