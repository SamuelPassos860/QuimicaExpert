import { Router } from 'express';
import { createAuditLog } from '../services/audit.ts';
import { deleteCompound, findCompoundByCas, listCompounds, saveCompound } from '../services/compounds.ts';
import type { CompoundUpsertBody } from '../types/chemistry.ts';
import { getSearchTerm } from '../utils/http.ts';
import { validateCompoundUpsert } from '../validators/compounds.ts';

const router = Router();

router.get('/', async (request, response) => {
  const search = getSearchTerm(request.query.search);

  try {
    const compounds = await listCompounds(search);
    response.json({ compounds });
  } catch (error) {
    console.error('Failed to query compounds table:', error);
    response.status(500).json({ error: 'Failed to query compounds table.' });
  }
});

router.post('/', async (request, response) => {
  const validation = validateCompoundUpsert((request.body ?? {}) as CompoundUpsertBody);

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  try {
    const compound = await saveCompound(validation.data!);
    const currentUser = response.locals.currentUser;

    if (currentUser) {
      await createAuditLog({
        actorUserId: currentUser.id,
        actorUserIdentifier: currentUser.userId,
        actorFullName: currentUser.fullName,
        eventType: 'compound_saved',
        resourceType: 'compound',
        resourceKey: compound.cas,
        metadata: {
          cas: compound.cas,
          compoundName: compound.nome,
          epsilon: compound.epsilon_m_cm,
          lambdaMax: compound.lambda_max,
          pathLength: compound.path_length_cm,
          concentration: compound.concentration_mol_l,
          absorbance: compound.absorbance,
          source: compound.fonte
        }
      });
    }

    response.status(201).json({ compound });
  } catch (error) {
    console.error('Failed to save compound:', error);
    response.status(500).json({ error: 'Failed to save compound.' });
  }
});

router.delete('/:cas', async (request, response) => {
  const cas = request.params.cas?.trim();

  if (!cas) {
    response.status(400).json({ error: 'cas is required.' });
    return;
  }

  try {
    const existingCompound = await findCompoundByCas(cas);

    if (!existingCompound) {
      response.status(404).json({ error: 'Compound not found.' });
      return;
    }

    const deleted = await deleteCompound(cas);

    if (!deleted) {
      response.status(404).json({ error: 'Compound not found.' });
      return;
    }

    const currentUser = response.locals.currentUser;

    if (currentUser) {
      await createAuditLog({
        actorUserId: currentUser.id,
        actorUserIdentifier: currentUser.userId,
        actorFullName: currentUser.fullName,
        eventType: 'compound_deleted',
        resourceType: 'compound',
        resourceKey: existingCompound.cas,
        metadata: {
          cas: existingCompound.cas,
          compoundName: existingCompound.nome
        }
      });
    }

    response.status(204).send();
  } catch (error) {
    console.error('Failed to delete compound:', error);
    response.status(500).json({ error: 'Failed to delete compound.' });
  }
});

export default router;
