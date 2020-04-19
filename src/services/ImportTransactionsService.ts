import csvParse from 'csv-parse';
import fs from 'fs';
import { getRepository, getCustomRepository, In } from 'typeorm';

import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface CsvObj {
  title: string;
  value: number;
  type: 'outcome' | 'income';
  category: string;
}

class ImportTransactionsService {
  async execute(filepath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    const readStream = fs.createReadStream(filepath);

    const parseConfig = csvParse({
      from_line: 2,
    });

    const parsedCsv = readStream.pipe(parseConfig);

    const transactions: CsvObj[] = [];
    const categories: string[] = [];

    parsedCsv.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, value, type, category });
    });

    await new Promise(resolve => parsedCsv.on('end', resolve));

    const existCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriestitles = existCategories.map(
      (category: Category) => category.title,
    );

    const addCategorytitles = categories
      .filter(category => !existentCategoriestitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      addCategorytitles.map(title => ({
        title,
      })),
    );

    categoryRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(filepath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
