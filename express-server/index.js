import path from "path";
import PocketBase from "pocketbase";
import express from "express";
import 'dotenv/config';
const pb = new PocketBase(process.env.PB_URL);
const app = express();
const __dirname = import.meta.dirname;

app.use(express.static(path.join(__dirname, "./dist")));

const assurePBAuth = async () => {
    if (pb.authStore.isValid) return;
    await pb.collection('users').authWithPassword(
        process.env.PB_USER,
        process.env.PB_PASS
    );
};

const deletionLookup = {};
const scheduleDeletion = async id => {
    if (
        Object.keys(deletionLookup).includes(id)
    ) return;
    deletionLookup[id] = setTimeout(async () => {
        await assurePBAuth();
        await pb.collection('file_share').delete(id);
        console.log(`Deleted ${id}`);
    }, 5 * 60 * 1e3);
};

app.get("/api/file", async (req, res) => {
    const key = req?.query?.key;
    if (!key) return res.status(400).send("No key present");
    await assurePBAuth();
    //check if file exists in pocketbase
    const sanatizedKey = key.replace(/[^\w\d]/g, "");
    const record = await pb.collection('file_share')
        .getFirstListItem(`key="${sanatizedKey}"`)
        .catch(err => false);
    if (!record) return res.json(null);
    const fileToken = await pb.files.getToken();
    const url = pb.files.getUrl(record, record.file, { 'token': fileToken });
    res.json({ ...record, url});
    await scheduleDeletion(record.id);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/dist/index.html'));
});

const PORT = 8080;
app.listen(PORT);
console.log(`Listening on port ${PORT}`);