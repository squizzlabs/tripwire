const ESI_BULK_LIMIT = 1000;

export async function fetchEsiBulk(values, fetchBatch) {
  const results = [];

  for (let index = 0; index < values.length; index += ESI_BULK_LIMIT) {
    const batch = values.slice(index, index + ESI_BULK_LIMIT);
    results.push(...(await fetchBatch(batch)));
  }

  return results;
}

function isEntityResolutionFailure(error) {
  return error?.status === 400 || error?.status === 404;
}

async function fetchResilientBatch(values, fetchBatch, fetchSingle) {
  try {
    return await fetchBatch(values);
  } catch (error) {
    if (!isEntityResolutionFailure(error)) throw error;

    if (values.length > 1) {
      const middle = Math.floor(values.length / 2);
      const left = await fetchResilientBatch(
        values.slice(0, middle),
        fetchBatch,
        fetchSingle,
      );
      const right = await fetchResilientBatch(
        values.slice(middle),
        fetchBatch,
        fetchSingle,
      );
      return [...left, ...right];
    }

    try {
      const result = await fetchSingle(values[0]);
      return result ? [result] : [];
    } catch (singleError) {
      if (isEntityResolutionFailure(singleError)) return [];
      throw singleError;
    }
  }
}

export async function fetchEsiBulkResilient(values, fetchBatch, fetchSingle) {
  const results = [];

  for (let index = 0; index < values.length; index += ESI_BULK_LIMIT) {
    const batch = values.slice(index, index + ESI_BULK_LIMIT);
    results.push(...(await fetchResilientBatch(batch, fetchBatch, fetchSingle)));
  }

  return results;
}
