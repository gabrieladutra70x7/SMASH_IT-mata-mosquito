const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serve os arquivos do Frontend (HTML, CSS, JS, Imagens)
app.use(express.static(path.join(__dirname, 'public')));

// Configuração da conexão com o Banco de Dados MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',         // Substitua pelo seu usuário do MySQL
    password: '',         // Substitua pela sua senha
    database: 'smash_it_db',
    waitForConnections: true,
    connectionLimit: 10
});

// ENDPOINT 1: Buscar Top 10 Pontuações (Para ranking.html)
app.get('/api/ranking', (req, res) => {
    const query = 'SELECT nickname, pontuacao, data_registro FROM ranking ORDER BY pontuacao DESC LIMIT 10';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Erro na consulta:', err);
            return res.status(500).json({ error: 'Erro ao buscar ranking' });
        }
        res.json(results);
    });
});

// ENDPOINT 2: Salvar Nova Pontuação (Disparado pelo jogo.js ao dar Game Over)
app.post('/api/ranking', (req, res) => {
    const { nickname, pontuacao } = req.body;

    if (!nickname || pontuacao === undefined) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }

    const query = 'INSERT INTO ranking (nickname, pontuacao) VALUES (?, ?)';
    db.query(query, [nickname, pontuacao], (err, result) => {
        if (err) {
            console.error('Erro ao salvar:', err);
            return res.status(500).json({ error: 'Erro ao salvar pontuação' });
        }
        res.status(201).json({ message: 'Pontuação registrada com sucesso!' });
    });
});

// Inicialização do Servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});