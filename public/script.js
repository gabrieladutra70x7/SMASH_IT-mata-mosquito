function iniciarJogo(event) {
    // 1. Evita que o formulário recarregue a página padrão do navegador
    event.preventDefault(); 

    const nickname = document.getElementById('nickname').value.trim();
    const level = document.getElementById('level').value;

    // 2. Salva as informações na memória do navegador
    localStorage.setItem('smashit_nickname', nickname);
    localStorage.setItem('smashit_level', level);

    // 3. Redireciona o usuário para a tela da partida
    window.location.href = 'jogo.html';
}