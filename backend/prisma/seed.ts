import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Starter list — the picker lets users add more, which just inserts here too.
const SPECIES_BREEDS: Record<string, string[]> = {
  Dog: ["Labrador Retriever", "German Shepherd", "Golden Retriever", "Beagle", "Poodle", "Bulldog", "Indie / Mixed", "Other"],
  Cat: ["Persian", "Siamese", "Maine Coon", "British Shorthair", "Indie / Domestic Shorthair", "Other"],
  Bird: ["Parakeet (Budgerigar)", "Cockatiel", "Lovebird", "Other"],
  Rabbit: ["Holland Lop", "Netherland Dwarf", "Other"],
  Hamster: ["Syrian", "Dwarf", "Other"],
  Fish: ["Goldfish", "Betta", "Other"],
  Reptile: ["Turtle", "Lizard", "Snake", "Other"],
  Other: ["Other"],
};

async function main() {
  for (const [speciesName, breeds] of Object.entries(SPECIES_BREEDS)) {
    const species = await prisma.species.upsert({
      where: { name: speciesName },
      update: {},
      create: { name: speciesName },
    });
    for (const breedName of breeds) {
      await prisma.breed.upsert({
        where: { speciesId_name: { speciesId: species.id, name: breedName } },
        update: {},
        create: { speciesId: species.id, name: breedName },
      });
    }
  }
  console.log("Seeded species & breeds");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
