import type { Entry } from "../../domain/entry/entry.entity.ts";
import type { FindEntriesOptions, IEntryRepository } from "../../domain/entry/entry.repository.ts";

export interface ListEntriesDeps {
  entryRepository: IEntryRepository;
}

export async function listEntriesUseCase(
  deps: ListEntriesDeps,
  input: { userId: string } & FindEntriesOptions,
): Promise<Entry[]> {
  const { userId, ...options } = input;
  return await deps.entryRepository.findByUserId(userId, options);
}
