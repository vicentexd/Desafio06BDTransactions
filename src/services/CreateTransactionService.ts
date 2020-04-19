import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome') {
      if (value > balance.total) {
        throw new AppError(
          'You have no balance to carry out this transaction',
          400,
        );
      }
    }

    let findCategory = await categoryRepository.findOne({
      title: category,
    });

    if (!findCategory) {
      findCategory = categoryRepository.create({
        title: category,
      });
      await categoryRepository.save(findCategory);
    }

    const transaction = await transactionsRepository.create({
      title,
      value,
      type,
      category_id: findCategory.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
