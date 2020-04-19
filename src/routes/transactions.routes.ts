import { Router } from 'express';
import { getCustomRepository } from 'typeorm';
import multer from 'multer';
import path from 'path';

import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';

const transactionsRouter = Router();

const upload = multer({ dest: path.resolve(__dirname, '..', '..', 'tmp') });

transactionsRouter.get('/', async (request, response) => {
  const transactionsRepository = getCustomRepository(TransactionsRepository);
  const balance = await transactionsRepository.getBalance();
  const transactions = await transactionsRepository.find({
    select: ['id', 'title', 'type', 'value', 'category'],
    relations: ['category'],
  });

  transactions.map(transaction => {
    const transactionCopy = { ...transaction };
    delete transactionCopy.category.created_at;
    delete transactionCopy.category.updated_at;
    return transactionCopy;
  });

  return response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request, response) => {
  const { title, value, type, category } = request.body;

  const createTransactionService = new CreateTransactionService();

  const transaction = await createTransactionService.execute({
    title,
    value,
    type,
    category,
  });

  return response.json(transaction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;

  const deleteTransactionService = new DeleteTransactionService();

  await deleteTransactionService.execute(id);

  return response.status(204).send();
});

transactionsRouter.post(
  '/import',
  upload.single('file'),
  async (request, response) => {
    const filepath = request.file.path;

    const importTransactionsService = new ImportTransactionsService();

    const transactions = await importTransactionsService.execute(filepath);

    return response.json(transactions);
  },
);

export default transactionsRouter;
