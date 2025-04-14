document.getElementById('upload-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const inputfile = document.getElementById('inputfile');
    const arquivos = inputfile.files;

    if (arquivos.length === 0) {
        console.error('Nenhum arquivo selecionado!');
        return;
    }

    try {
        const directoryHandle = await window.showDirectoryPicker({
            startIn: 'documents',
            mode: 'readwrite'
        });

        let db = await getDatabase(directoryHandle);
        let nextId = db.files.length > 0 ? Math.max(...db.files.map(item => item.id)) + 1 : 1;

        for (const arquivo of arquivos) {
            const nome = arquivo.name;
            const tipo = nome.split('.').pop().toLowerCase();
            const ultimaEdicao = new Date(arquivo.lastModified).toISOString().split('T')[0];
            const importacao = new Date().toISOString().split('T')[0];

            console.log({
                name: nome,
                type: tipo,
                lastModified: ultimaEdicao,
                importatedDate: importacao
            });

            db.files.push({
                id: nextId++,
                name: nome,
                type: tipo,
                lastModified: ultimaEdicao,
                importatedDate: importacao
            });

            const extensionFolder = await directoryHandle.getDirectoryHandle(tipo, { create: true });

            const fileHandle = await extensionFolder.getFileHandle(nome, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(arquivo);
            await writable.close();
        }

        db.lastUpdate = formatDateTime(new Date());

        // Salva o JSON atualizado
        await saveDatabase(directoryHandle, db);

        console.log('JSON atualizado com sucesso!');
    } catch (err) {
        console.error('Erro ao atualizar os dados:', err);
    }
});

function formatDateTime(date) {
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}h${pad(date.getMinutes())}m${pad(date.getSeconds())}s`;
}

async function getDatabase(directoryHandle) {
    try {
        const fileHandle = await directoryHandle.getFileHandle('imported-db.json', { create: true });
        const file = await fileHandle.getFile();
        const text = await file.text();
        return text ? JSON.parse(text) : { lastUpdate: formatDateTime(new Date()), files: [] };
    } catch (error) {
        console.error('Erro ao acessar imported-db.json:', error);
        return { lastUpdate: formatDateTime(new Date()), files: [] };
    }
}

async function saveDatabase(directoryHandle, db) {
    try {
        const fileHandle = await directoryHandle.getFileHandle('imported-db.json', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(db, null, 2));
        await writable.close();
    } catch (error) {
        console.error('Erro ao salvar imported-db.json:', error);
    }
}