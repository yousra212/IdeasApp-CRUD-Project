import express from "express";
import pool from './database.js';

export const router = express.Router();

router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const rows = await connection.query("SELECT * FROM ideas");
        console.log(`Retrieved ${rows.length} rows from database`);
        res.send(rows);
    } catch (err) {
        console.error("Failed to connect ideas from Database", err);
        res.status(500).send("Failed to connect ideas from Database");
    } finally {
        if (connection) await connection.release();
    }
});

router.post('/', async (req, res) => {
    const { title, description } = req.body;
    if (!title || !description) {
        const err = new Error ("Title and description cannot be empty")
        res.status(400).send(err.message);
        return;
    }
    let connection;
    try {
        connection = await pool.getConnection();
        const result = await connection.execute(
            "INSERT INTO ideas (title, description) VALUES (?, ?)", 
            [title, description]
            );
        const id = result.insertId;
        res.setHeader('Content-Type', 'application/json');
        res.send({id:Number(id), title, description});
    } catch (err) {
        console.error("Failed to insert idea into Database", err);
        res.status(500).send("Failed to insert idea into Database");
    } finally {
        if (connection) await connection.release();
    }
});

router.route('/:id')
    .get(async (req, res, next) => {
        const id = req.params.id;
        // is the id received correctly?
        console.log(`Received request for idea with ID ${id}`);
        let connection;
        try {
            connection = await pool.getConnection();
            const sql = 'SELECT id, title, description, created_at FROM ideas WHERE id = ?';
            // is the SQL query correct?
            console.log(`Executing SQL query: ${sql} with ID ${id}`);
            const [idea] = await connection.execute(sql, [id]).catch((error) => {
                console.error(`Error executing SQL query: ${sql} with ID ${id}`, error);
            });
            console.log('Database response:', idea);
            // is the idea retrieved correctly?
            console.log(`Retrieved idea from database:`, idea);
            if (!idea) {
                res.status(404).send(`Idea with id ${id} not found`);
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.json(idea);
            }
        } catch (err) {
            console.error(`Failed to get idea with id ${id} from database:`, err);
            next(err);
        } finally {
            if (connection) await connection.release();
        }
    })
    .put(async (req, res, next) => {
        console.log('d',req.body)
        const { title, description } = req.body;
        const { id } = req.params;
        if (!title || !description) {
            const err = new Error('Title and description cannot be empty');
            res.status(400).send(err.message);
            return;
        }
        console.log(`Updating idea ${id} with title ${title} and description ${description}`);
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.execute(
                'UPDATE ideas SET title=?, description=? WHERE id=?',
                [title, description, id]
            );
            const updatedIdea = {
                id: Number(id),
                title,
                description,
            };
            res.setHeader('Content-Type', 'application/json');
            res.send(updatedIdea);
        } catch (err) {
            console.error('Failed to update idea:', err);
            next(err);
        } finally {
            if (connection) await connection.release();
        }
    })
    .delete(async (req, res, next) => {
        const id = req.params.id;
        let connection;
        try {
            connection = await pool.getConnection();
            const stmt = await connection.prepare('DELETE FROM ideas WHERE id = ?');
            const result = await stmt.execute(id);
            if (result.affectedRows === 0) {
                res.status(404).send('Idea not found');
            } else {
                res.send('Idea deleted successfully');
            }
        } catch (err) {
            console.error('Failed to delete idea:', err);
            next(err);
        } finally {
            if (connection) await connection.release();
        }
    });
