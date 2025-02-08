const styles = [
    "Photorealistic", "Artistic", "Conceptual", "3D", "Minimalist", "Surreal", "Cyberpunk", 
    "Steampunk", "Fantasy", "Sci-Fi", "Horror", "Dark Fantasy", "Anime", "Cartoon", "Abstract",
    "Portrait", "Landscape", "Animals", "Food", "Architecture", "Fashion", "Nature", "Urban",
    "Space", "Historical", "Mythological", "Watercolor", "Oil Painting", "Ink Sketch", "Grunge",
    "Neon", "Pixel Art", "Mosaic", "Collage", "3D Rendered", "Fantasy World", "Dystopian Future",
    "Post-Apocalyptic", "Superhero", "Horror Movie Poster", "Historical Fiction", 
    "Science Fiction Novel Cover", "Fairy Tale Illustration", "Dreamscape", "Abstract Expressionism"
];

const styleSelect = document.getElementById('styleSelect');
const promptInput = document.getElementById('promptInput');
const ratioSelect = document.getElementById('ratioSelect');
const generateBtn = document.getElementById('generateBtn');
const artGallery = document.getElementById('artGallery');
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById("modalImage");
const closeBtn = document.getElementsByClassName("close")[0];
const loadingIndicator = document.getElementById('loadingIndicator');

let isLoading = false;

// Add keydown event listener to promptInput to trigger generateArt on Enter
promptInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default action (form submission, etc.)
        generateBtn.click(); // Simulate button click to maintain consistency
    }
});

// Populate style select options
styles.forEach(style => {
    if (style !== "Photorealistic") {
        const option = document.createElement('option');
        option.value = style;
        option.textContent = style;
        styleSelect.appendChild(option);
    }
});

function enhancePrompt(prompt, style) {
    const enhancers = [
        "highly detailed", "intricate", "photorealistic", "4k resolution",
        "vibrant colors", "dramatic lighting", "professional photography",
        "cinematic", "award-winning", "masterpiece", "ultra-realistic",
        "lifelike", "hyper-detailed", "studio quality", "perfect composition"
    ];
    const randomEnhancers = enhancers.sort(() => 0.5 - Math.random()).slice(0, 4);
    return `${style}. ${prompt}, ${randomEnhancers.join(", ")}, trending on MidJourney, 8k resolution`;
}

const fixedSeeds = [1, 2, 3, 4, 5, 6, 7, 8]; // Lx | This Controls the number of images outputted 

function getDimensions(ratio) {
    const maxDimension = 1024;
    let width, height;

    switch (ratio) {
        case "16:9":
            width = maxDimension;
            height = Math.round(width * 9 / 16);
            break;
        case "3:2":
            width = maxDimension;
            height = Math.round(width * 2 / 3);
            break;
        case "2:3":
            height = maxDimension;
            width = Math.round(height * 2 / 3);
            break;
        case "9:16":
            height = maxDimension;
            width = Math.round(height * 9 / 16);
            break;
        case "4:3":
            width = maxDimension;
            height = Math.round(width * 3 / 4);
            break;
        case "3:4":
            height = maxDimension;
            width = Math.round(height * 3 / 4);
            break;
        case "5:4":
            width = maxDimension;
            height = Math.round(width * 4 / 5);
            break;
        case "4:5":
            height = maxDimension;
            width = Math.round(height * 4 / 5);
            break;
        default: // 1:1
            width = height = maxDimension;
    }

    return { width, height };
}

async function downloadImage(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Lx.png';
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error("Error downloading image:", error);
    }
}

function generateArt() {
    if (isLoading) return;
    isLoading = true;
    loadingIndicator.style.display = 'block';

    const style = styleSelect.value;
    const basePrompt = promptInput.value || "blueprint of a robobee";
    const enhancedPrompt = enhancePrompt(basePrompt, style);
    const ratio = ratioSelect.value;
    const { width, height } = getDimensions(ratio);

    artGallery.innerHTML = '';

    fixedSeeds.forEach(seed => {
        const artPiece = document.createElement('div');
        artPiece.className = 'art-piece';

        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=${width}&height=${height}&nologo=true`;

        artPiece.innerHTML = `
            <img src="${imageUrl}" alt="${enhancedPrompt}" onclick="openModal('${imageUrl}')">
            <div class="art-info">
                <p><b>Style</b>: ${style}</p>
                <p><b>Dimensions</b>: ${width}x${height}</p>
                <p><b>Ratio</b>: ${ratio}</p>
            </div>
            <div class="image-controls">
                <button onclick="downloadImage('${imageUrl}')" title="Download">
                    <i class="fa-solid fa-angles-down"></i>
                </button>
            </div>
        `;

        artGallery.appendChild(artPiece);
    });

    isLoading = false;
    loadingIndicator.style.display = 'none';
}

function openModal(src) {
    modal.style.display = "block";
    modalImg.src = src;
}

closeBtn.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

generateBtn.addEventListener('click', generateArt);

// Generate initial art pieces
generateArt();