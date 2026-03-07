const axios = require('axios');

async function testIsaac() {
    try {
        // Login as Isaac
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'isaac.maia@senai.br',
            senha: 'senha123'
        });
        const token = loginRes.data.token;
        const id = loginRes.data.usuario.id;

        console.log('LOGADO COMO ISAAC ID:', id);

        const res = await axios.get(`http://localhost:3001/api/dashboard/colaborador/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('RESPOSTA DASHBOARD:', JSON.stringify(res.data, null, 2));

        const resPend = await axios.get(`http://localhost:3001/api/avaliacoes/pendentes`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('RESPOSTA PENDENTES:', JSON.stringify(resPend.data, null, 2));

    } catch (e) {
        console.error('ERRO NO TESTE:', e.response?.status, e.response?.data || e.message);
    }
}

testIsaac();
