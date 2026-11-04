export const estimateHeater = (usage, rooms, housePrice = 0) => {
  const entries = rooms.map(room => ({
    room,
    people: Number(room.previousPeopleCount ?? room.peopleCount ?? room.people ?? 0),
    price: Number(room.priceElecOverride ?? room.effectiveServicePrices?.priceElec ?? housePrice),
  }));
  const people = entries.reduce((sum, entry) => sum + entry.people, 0);
  const items = entries.map(entry => {
    const quantity = people > 0 ? Math.max(0, usage) * entry.people / people : 0;
    return { ...entry, quantity, amount: Math.floor(quantity * entry.price / 1000) * 1000 };
  });
  return { people, items, total: items.reduce((sum, item) => sum + item.amount, 0) };
};
