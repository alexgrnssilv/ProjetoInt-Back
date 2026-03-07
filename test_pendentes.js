const axios = require('axios');

async function testPendentes() {
    try {
        // We need a token. Let's use the login endpoint first for Isaac
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'isaac.maia@senai.br',
            senha: 'senha123'
        });
        const token = loginRes.data.token;

        const res = await axios.get('http://localhost:3001/api/avaliacoes/pendentes', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('PENDENCIAS ISAAC:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('ERRO NO TESTE:', e.response?.data || e.message);
    }
}

testPendentes();
