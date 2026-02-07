import { getInteractions } from './getInteractions';

export const getKnownCompanies = async (): Promise<string[]> => {
  const interactions = await getInteractions();
  const companies = new Set(
    interactions
      .map(item => item.company_name)
      .filter(name => name && name.trim().length > 0)
  );
  return Array.from(companies).sort();
};