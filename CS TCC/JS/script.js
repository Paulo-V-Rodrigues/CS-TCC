/*REFERÊNCIAS*/
const canvas = document.getElementById("canvas");
const svg = document.getElementById("connections");

let connections = [];
let startBlock = null;

/*DEFINIÇÃO DE SETA SVG*/
// Criamos o container de definições
const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");

marker.setAttribute("markerWidth", "10");
marker.setAttribute("markerHeight", "10");
marker.setAttribute("refX", "9"); // Ajustado para a ponta da seta tocar o bloco
marker.setAttribute("refY", "3");
marker.setAttribute("orient", "auto");
marker.setAttribute("markerUnits", "strokeWidth");

const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
arrowPath.setAttribute("d", "M0,0 L10,3 L0,6 Z");
arrowPath.setAttribute("fill", "#333");

marker.appendChild(arrowPath);
defs.appendChild(marker);
svg.appendChild(defs);

/*NOMES*/
const nomes = {
    terminal: "Terminal",
    processo: "Processamento",
    entrada_saida: "Entrada / Saída",
    decisao: "Decisão",
    desvio: "Desvio",
    entrada_manual: "Entrada Manual",
    exibir: "Exibir / Saída",
    conector_pagina: "Conector de Página"
};

/*PALETA*/
document.querySelectorAll(".palette-item").forEach(item => {
    item.addEventListener("click", () => {
        const r = canvas.getBoundingClientRect();
        createBlock(item.dataset.type, r.width / 2, r.height / 2);
    });

    item.addEventListener("dragstart", e => {
        e.dataTransfer.setData("type", item.dataset.type);
    });
});

/*DROP*/
document.addEventListener("dragover", e => e.preventDefault());

document.addEventListener("drop", e => {
    e.preventDefault();

    const type = e.dataTransfer.getData("type");

    if (!type) return;

    if (type === "imagem") {
        const src = e.dataTransfer.getData("src");
        createImageBlock(src, e.offsetX, e.offsetY);
    } else {
        createBlock(type, e.offsetX, e.offsetY);
    }
});

// create img block

function createImageBlock(src, x, y) {
    const block = document.createElement("div");
    block.className = "block image-block";
    block.dataset.type = "imagem";
    block.style.left = x + "px";
    block.style.top = y + "px";

    const img = document.createElement("img");
    img.src = src;
    img.style.width = "80px";
    img.style.height = "auto";
    img.draggable = false; // importante

    const handle = document.createElement("div");
    handle.className = "resize-handle";

    block.appendChild(img);
    block.appendChild(handle);
    canvas.appendChild(block);

    makeDraggable(block);
    makeResizable(block, img, handle);
}

/*CRIA BLOCO*/
function createBlock(type, x, y) {
    const block = document.createElement("div");
    block.className = `block ${type}`;
    block.dataset.type = type;
    block.style.left = x + "px";
    block.style.top = y + "px";

    let content;
    if (type === "decisao") {
        const shape = document.createElement("div");
        shape.className = "decisao-shape";
        content = document.createElement("div");
        content.className = "content";
        content.contentEditable = true;
        content.innerText = nomes[type];
        shape.appendChild(content);
        block.appendChild(shape);
    } else {
        content = document.createElement("div");
        content.className = "content";
        content.contentEditable = true;
        content.innerText = nomes[type];
        block.appendChild(content);
    }

    const input = document.createElement("div");
    input.className = "connector in";
    const output = document.createElement("div");
    output.className = "connector out";

    block.append(input, output);
    canvas.appendChild(block);

    makeDraggable(block);

    // Iniciar conexão a partir do conector de saída
    output.onmousedown = e => {
        e.stopPropagation();
        startBlock = block;
    };

    // Finalizar conexão no conector de entrada
    input.onmouseup = e => {
        e.stopPropagation();
        if (startBlock && startBlock !== block) {
            createConnection(startBlock, block);
        }
        startBlock = null;
    };

        // Referência ao elemento do balão
    const tooltip = document.getElementById("tooltip");

    function setupTooltip(element, text) {
        element.addEventListener("mouseenter", (e) => {
            tooltip.innerText = text;
            tooltip.style.display = "block";
            
            // Posicionamento dinâmico
            const rect = element.getBoundingClientRect();
            tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + "px";
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + "px";
        });

        element.addEventListener("mouseleave", () => {
            tooltip.style.display = "none";
        });
    }

    // Dentro da função createBlock
    setupTooltip(input, "Entrada de Fluxo");
    setupTooltip(output, "Saída de Fluxo");
}

/*CONEXÃO COM VALIDAÇÃO*/
function createConnection(from, to) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-width", 2);

    const valid = validateConnection(from, to);
    
    // Mudamos a cor da linha para azul se for válido, ou vermelho se falhar
    path.setAttribute("stroke", valid ? "#1565c0" : "red");

    if (valid) {
        // Buscamos os círculos específicos dentro dos blocos
        const outConnector = from.querySelector(".connector.out");
        const inConnector = to.querySelector(".connector.in");

        // Adicionamos a classe 'connected' (que definiremos no CSS)
        if (outConnector) outConnector.classList.add("connected");
        if (inConnector) inConnector.classList.add("connected");
    }

    svg.appendChild(path);
    connections.push({ from, to, path });
    updateConnections();
}

/*LINHAS (BEZIER) COM PRECISÃO */
function updateConnections() {
    // Pegamos a posição do container SVG para servir de ponto zero
    const svgRect = svg.getBoundingClientRect();

    connections.forEach(c => {
        const fromRect = c.from.getBoundingClientRect();
        const toRect = c.to.getBoundingClientRect();

        // Ponto de saída: Meio da face DIREITA do bloco de origem
        const x1 = fromRect.right - svgRect.left;
        const y1 = fromRect.top + (fromRect.height / 2) - svgRect.top;

        // Ponto de entrada: Meio da face ESQUERDA do bloco de destino
        // Subtraímos 1 ou 2 pixels para garantir que a ponta da seta encoste na borda
        const x2 = toRect.left - svgRect.left;
        const y2 = toRect.top + (toRect.height / 2) - svgRect.top;

        // Cálculo dinâmico da curvatura (ajusta a força da curva baseada na distância)
        const deltaX = Math.abs(x2 - x1) * 0.5;
        const tension = Math.max(deltaX, 20); // Garante o mínimo de curva

        // M = Move para início, C = Curva de Bezier (Ponto Controle 1, Ponto Controle 2, Ponto Final)
        const d = `M ${x1} ${y1} 
                   C ${x1 + tension} ${y1}, 
                     ${x2 - tension} ${y2}, 
                     ${x2} ${y2}`;
        
        c.path.setAttribute("d", d);
    });
}

/*VALIDAÇÃO LÓGICA*/
function validateConnection(from, to) {
    if (from === to) return false;
    
    const fromType = from.dataset.type;
    if (fromType === "decisao") {
        const count = connections.filter(c => c.from === from).length;
        if (count >= 2) return false;
    }
    return true;
}

/*DRAG*/
function makeDraggable(el) {
    let ox, oy;
    el.addEventListener("mousedown", e => {
        if (e.target.classList.contains("content") || e.target.classList.contains("connector")) return;

        const r = el.getBoundingClientRect();
        const cr = canvas.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;

        document.onmousemove = ev => {
            el.style.left = (ev.clientX - cr.left - ox) + "px";
            el.style.top  = (ev.clientY - cr.top - oy) + "px";
            updateConnections(); // Reposiciona as linhas enquanto arrasta
        };

        document.onmouseup = () => document.onmousemove = null;
    });
}

// IMG PALETTE Linguagens

document.querySelectorAll(".palette-img").forEach(img => {
    img.addEventListener("dragstart", e => {
        e.dataTransfer.setData("type", "imagem");
        e.dataTransfer.setData("src", img.src);
    });
});

//redimensionar img

function makeResizable(block, img, handle) {
    let startX, startWidth;

    handle.addEventListener("mousedown", e => {
        e.stopPropagation();

        startX = e.clientX;
        startWidth = img.offsetWidth;

        document.onmousemove = ev => {
            const newWidth = startWidth + (ev.clientX - startX);
            if (newWidth > 40) {
                img.style.width = newWidth + "px";
                updateConnections();
            }
        };

        document.onmouseup = () => {
            document.onmousemove = null;
            document.onmouseup = null;
        };
    });
}

// BUSCA DE IMAGENS

const searchInput = document.getElementById("image-search");
const images = document.querySelectorAll(".palette-img");

searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase();

    images.forEach(img => {
        const name = img.dataset.name?.toLowerCase() || "";
        const alt = img.alt?.toLowerCase() || "";

        if (name.includes(value) || alt.includes(value)) {
            img.style.display = "block";
        } else {
            img.style.display = "none";
        }
    });
});

