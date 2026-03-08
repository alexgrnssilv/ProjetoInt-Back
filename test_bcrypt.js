const bcrypt = require('bcryptjs')

async function test() {
    const passwordInput = 'senha123'
    const hashFromDB = '$2a$10$7QJ8YPr6jA/T.f3W.f5u0.j3O3/7QJ8YPr6jA/T.f3W.f5u0.' // Simplified for test

    // Let's use the actual hash from previous output if possible, but I only got 10 chars.
    // Wait, I can generate a NEW hash and test it to see if bcrypt is working as expected.

    const salt = await bcrypt.genSalt(10)
    const newHash = await bcrypt.hash(passwordInput, salt)
    const matches = await bcrypt.compare(passwordInput, newHash)

    console.log('Teste bcrypt local:')
    console.log('Input:', passwordInput)
    console.log('Match:', matches)
}

test()
