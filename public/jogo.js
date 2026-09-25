// CONFIGURAÇÕES E ESTADO DO JOGO
let nickname = localStorage.getItem('smashit_nickname') || 'Jogador';
let nivel = localStorage.getItem('smashit_level') || 'atletinhas';

let vidas = 3;
let pontuacao = 0;
let jogoAtivo = true;
let petecaAtual = null;
let tempoPetecaTimeout = null;
let loopJogoInterval = null;

// Configurações por dificuldade (tempo em ms)
const DIFICULDADE = {
    atletinhas: { tempoEmTela: 2200, intervaloSpawn: 1200 },
    PanAm:      { tempoEmTela: 1500, intervaloSpawn: 900 },
    lindan:     { tempoEmTela: 900,  intervaloSpawn: 600 }
};

const configAtual = DIFICULDADE[nivel] || DIFICULDADE.atletinhas;

// DOM
const arena = document.getElementById('game-arena');
const scoreText = document.getElementById('score-text');
const heartsContainer = document.getElementById('hearts-container');
const handCursor = document.getElementById('hand-cursor');
const modalGameOver = document.getElementById('game-over-modal');

// ==================== LÓGICA PRINCIPAL DO JOGO ====================

function iniciarPartida() {
    vidas = 3;
    pontuacao = 0;
    jogoAtivo = true;
    scoreText.innerText = pontuacao;
    
    // Inicia o spawn contínuo de petecas
    loopJogoInterval = setInterval(gerarPeteca, configAtual.intervaloSpawn + configAtual.tempoEmTela);
    gerarPeteca();
}

function gerarPeteca() {
    if (!jogoAtivo) return;

    // Remove peteca anterior se ainda existir
    removerPetecaAtual();

    // Criar elemento peteca
    const peteca = document.createElement('img');
    peteca.src = 'img/peteca.png'; // Garanta que a imagem exista nesta pasta
    peteca.className = 'peteca';
    
    // Fallback de imagem caso o arquivo PNG ainda não esteja no servidor
    peteca.onerror = () => {
        peteca.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23ff3838"/><path d="M50 10 L30 40 L70 40 Z" fill="%23f1c40f"/></svg>';
    };

    // Variar tamanhos
    const tamanhos = ['peteca-p', 'peteca-m', 'peteca-g'];
    const tamanhoSorteado = tamanhos[Math.floor(Math.random() * tamanhos.length)];
    peteca.classList.add(tamanhoSorteado);

    // Posição aleatória na tela (evitando bordas)
    const padding = 100;
    const maxX = window.innerWidth - padding;
    const maxY = window.innerHeight - padding - 80; // Desconto da header

    const posX = Math.floor(Math.random() * (maxX - padding)) + padding;
    const posY = Math.floor(Math.random() * (maxY - padding)) + padding;

    peteca.style.left = `${posX}px`;
    peteca.style.top = `${posY}px`;

    // Evento de Clique (rebater peteca)
    peteca.addEventListener('click', (e) => {
        e.stopPropagation(); // Impede que o clique conte como erro na arena
        acertarPeteca();
    });

    arena.appendChild(peteca);
    petecaAtual = peteca;

    // Temporizador: Se não rebater no tempo limite, perde 1 vida
    tempoPetecaTimeout = setTimeout(() => {
        if (petecaAtual === peteca) {
            removerPetecaAtual();
            perderVida();
        }
    }, configAtual.tempoEmTela);
}

function acertarPeteca() {
    if (!jogoAtivo) return;

    pontuacao += 10;
    scoreText.innerText = pontuacao;
    removerPetecaAtual();
}

function registrarErroClique(event) {
    // Clique na arena vazia = perde vida por erro
    if (!jogoAtivo) return;
    if (event.target === arena) {
        perderVida();
    }
}

function removerPetecaAtual() {
    if (tempoPetecaTimeout) clearTimeout(tempoPetecaTimeout);
    if (petecaAtual && petecaAtual.parentNode) {
        petecaAtual.parentNode.removeChild(petecaAtual);
    }
    petecaAtual = null;
}

function perderVida() {
    if (!jogoAtivo) return;

    vidas--;
    atualizarCoracoes();

    if (vidas <= 0) {
        encerrarJogo();
    }
}

function atualizarCoracoes() {
    const hearts = heartsContainer.querySelectorAll('.heart');
    hearts.forEach((heart, index) => {
        if (index >= vidas) {
            heart.classList.add('lost');
        }
    });
}

async function encerrarJogo() {
    jogoAtivo = false;
    clearInterval(loopJogoInterval);
    removerPetecaAtual();

    document.getElementById('final-score-text').innerText = `Sua pontuação final: ${pontuacao}`;
    modalGameOver.style.display = 'flex';

    // Envio do ranking para a API Node.js
    try {
        await fetch('/api/ranking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, pontuacao })
        });
    } catch (err) {
        console.error('Erro ao salvar pontuação:', err);
    }
}

// ==================== INTEGRACÃO MEDIAPIPE HANDS ====================

const videoElement = document.getElementById('webcam');

function setupMediaPipe() {
    // 1. Verifica se o navegador suporta acesso a mídias
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        exibirAvisoCamera("Seu navegador não suporta acesso à câmera. Jogue usando o mouse!");
        return;
    }

    try {
        const hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
        });

        hands.onResults(processarGestoMao);

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({ image: videoElement });
            },
            width: 320,
            height: 240
        });

        // 2. Captura de erros ao tentar iniciar a câmera
        camera.start().catch((err) => {
            console.error("Erro ao iniciar MediaPipe Camera:", err);
            exibirAvisoCamera("Câmera bloqueada ou indisponível. Você pode jogar clicando com o mouse!");
        });

    } catch (error) {
        console.error("Erro ao inicializar MediaPipe:", error);
        exibirAvisoCamera("Não foi possível carregar o rastreamento. Jogue pelo mouse!");
    }
}

// Função para exibir mensagem discreta de aviso na tela do jogo
function exibirAvisoCamera(mensagem) {
    const webcamBox = document.querySelector('.webcam-box');
    if (webcamBox) {
        webcamBox.style.borderColor = '#ff3838';
        webcamBox.innerHTML = `<span style="font-size:0.7rem; color:#fff; padding:5px; display:block; text-align:center;">⚠️ ${mensagem}</span>`;
    }
}
function processarGestoMao(results) {
    if (!jogoAtivo || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        handCursor.style.display = 'none';
        return;
    }

    handCursor.style.display = 'block';
    const landmarks = results.multiHandLandmarks[0];

    // Mão mapeada: Posição do indicador (landmark 8)
    // Invertemos X por causa da webcam espelhada
    const x = (1 - landmarks[8].x) * window.innerWidth;
    const y = landmarks[8].y * window.innerHeight;

    handCursor.style.left = `${x}px`;
    handCursor.style.top = `${y}px`;

    // DETECÇÃO DE MÃO FECHADA (PUNHO)
    // Calcula a distância entre a ponta dos dedos e o pulso (landmark 0)
    const pulso = landmarks[0];
    const pontaIndicador = landmarks[8];
    const pontaMedio = landmarks[12];

    const distIndicador = Math.hypot(pontaIndicador.x - pulso.x, pontaIndicador.y - pulso.y);
    const distMedio = Math.hypot(pontaMedio.x - pulso.x, pontaMedio.y - pulso.y);

    const maoFechada = distIndicador < 0.25 && distMedio < 0.25;

    if (maoFechada) {
        handCursor.classList.add('closed');
        
        // Verifica se o cursor está em cima da peteca
        if (petecaAtual) {
            const rect = petecaAtual.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                acertarPeteca();
            }
        }
    } else {
        handCursor.classList.remove('closed');
    }
}

// Inicializar Partida e MediaPipe ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    iniciarPartida();
    setupMediaPipe();
});