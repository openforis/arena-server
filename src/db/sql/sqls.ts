export const SQLs = {
  createAlias: (name: string): string =>
    // add '_' prefix to avoid collision with reserved words
    `_${name
      .split('_')
      .map((word) => word[0])
      .join('')}`,
}
