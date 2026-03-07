const axios = require('axios');

async function testAdminActions() {
    try {
        // Login as admin
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@senai.br',
            senha: 'senha123'
        });
        const token = loginRes.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        console.log('--- TESTANDO TOGGLE CICLO (ID 2) ---');
        try {
            const toggleRes = await axios.put('http://localhost:3001/api/admin/ciclos/2', { fechado: true }, config);
            console.log('TOGGLE SUCESSO:', toggleRes.data.fechado);
        } catch (e) {
            console.error('TOGGLE ERRO:', e.response?.data || e.message);
        }

        console.log('\n--- TESTANDO DELETE USUARIO (ID 3 - Maria Santos) ---');
        try {
            const delUserRes = await axios.delete('http://localhost:3001/api/admin/usuarios/3', config);
            console.log('DELETE USUARIO SUCESSO:', delUserRes.data.mensagem);
        } catch (e) {
            console.error('DELETE USUARIO ERRO:', e.response?.data || e.message);
        }

        console.log('\n--- TESTANDO DELETE CICLO (ID 2) ---');
        try {
            const delCicloRes = await axios.delete('http://localhost:3001/api/admin/ciclos/2', config);
            console.log('DELETE CICLO SUCESSO:', delCicloRes.data.mensagem);
        } catch (e) {
            console.error('DELETE CICLO ERRO:', e.response?.data || e.message);
        }

    } catch (e) {
        console.error('ERRO GERAL:', e.response?.data || e.message);
    }
}

testAdminActions();
