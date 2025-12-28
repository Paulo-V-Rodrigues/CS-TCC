/*REFERÊNCIAS*/
const canvas = document.getElementById("canvas");
const svg = document.getElementById("connections");

let connections = [];
let startBlock = null;

/*DEFINIÇÃO DE SETA SVG*/
const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
marker.setAttribute("id", "arrow");
marker.setAttribute("markerWidth", "10");
marker.setAttribute("markerHeight", "10");
marker.setAttribute("refX", "10");
marker.setAttribute("refY", "3");
marker.setAttribute("orient", "auto");

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
canvas.addEventListener("dragover", e => e.preventDefault());
canvas.addEventListener("drop", e => {
    createBlock(e.dataTransfer.getData("type"), e.offsetX, e.offsetY);
});

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

    output.onmousedown = e => {
        e.stopPropagation();
        startBlock = block;
    };

    input.onmouseup = e => {
        e.stopPropagation();
        if (startBlock && startBlock !== block) {
            createConnection(startBlock, block);
        }
        startBlock = null;
    };
}

/*CONEXÃO COM VALIDAÇÃO*/
function createConnection(from, to) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-width", 3);
    path.setAttribute("marker-end", "url(#arrow)");

    const valid = validateConnection(from, to);
    path.setAttribute("stroke", valid ? "green" : "red");

    svg.appendChild(path);

    connections.push({ from, to, path });
    updateConnections();
}

/*VALIDAÇÃO LÓGICA*/
function updateConnections() {
    const canvasRect = canvas.getBoundingClientRect();

    connections.forEach(c => {
        const f = c.from.getBoundingClientRect();
        const t = c.to.getBoundingClientRect();

        const x1 = f.right - canvasRect.left;
        const y1 = f.top + f.height / 2 - canvasRect.top;

        const x2 = t.left - canvasRect.left;
        const y2 = t.top + t.height / 2 - canvasRect.top;

        const d = `
            M ${x1} ${y1}
            C ${x1 + 80} ${y1},
              ${x2 - 80} ${y2},
              ${x2} ${y2}
        `;

        c.path.setAttribute("d", d);
    });
}

/*ATUALIZA LINHAS*/
function validateConnection(from, to) {
    const fromType = from.dataset.type;
    const toType = to.dataset.type;

    // Decisão: máximo 2 saídas
    if (fromType === "decisao") {
        const count = connections.filter(c => c.from === from).length;
        if (count >= 2) return false;
    }

    // Não conectar em si mesmo
    if (from === to) return false;

    return true;
}

/*DRAG*/
function makeDraggable(el) {
    let ox, oy;

    el.addEventListener("mousedown", e => {
        if (
            e.target.classList.contains("content") ||
            e.target.classList.contains("connector")
        ) return;

        const r = el.getBoundingClientRect();
        const cr = canvas.getBoundingClientRect();

        ox = e.clientX - r.left;
        oy = e.clientY - r.top;

        document.onmousemove = ev => {
            el.style.left = (ev.clientX - cr.left - ox) + "px";
            el.style.top  = (ev.clientY - cr.top - oy) + "px";
            updateConnections();
        };

        document.onmouseup = () => document.onmousemove = null;
    });
}