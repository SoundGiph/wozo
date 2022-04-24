import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SoundGifPort } from "../core/application/ports/sound-gif.ports";
import { FindSoundGifPayload } from "../core/application/queries/find-sound-gif/find-sound-gif.query";
import { CategoriesWithSoundGifs } from "../core/application/queries/get-all-categories-with-soundgifs/get-all-categories-with-soundgifs.command";
import { SoundGifEntity, SoundGifEntityMandatoryFields } from "../core/domain/sound-gif.entity";
import { searchSoundGifQuery } from "./utils/searchSoundGifQueryBuilder";

export class SoundGifAdapter implements SoundGifPort {
  private readonly logger = new Logger();
  constructor(
    @InjectRepository(SoundGifEntity)
    private readonly soundGifRepository: Repository<SoundGifEntity>
  ) {}

  public async find(payload: FindSoundGifPayload): Promise<SoundGifEntity[]> {
    const { fulltext, filters } = payload;
    this.logger.log(
      `SoundGifAdapter > find > called with fulltext: ${fulltext} and filters: ${filters}`
    );
    return await searchSoundGifQuery(this.soundGifRepository, filters, fulltext);
  }

  public async getAllCategories(): Promise<string[]> {
    this.logger.log("SoundGifAdapter > getAllCategories > start");
    const allSoundGifs = await this.soundGifRepository.find({});
    const allCategories = allSoundGifs.map(soundGif => soundGif.categories).flat();
    const allCategoriesWithoutDuplicatedValues = Array.from(new Set(allCategories)).sort();
    return allCategoriesWithoutDuplicatedValues;
  }

  public async getAllCategoriesWithSoundGifs(): Promise<CategoriesWithSoundGifs[]> {
    const categories = await this.getAllCategories();
    const mostSharedSoundGifs = await this.find({ filters: { mostShared: true } });
    const mostRecentSoundGifs = await this.find({ filters: { mostRecent: true } });
    const categoriesWithSoundgifs = await Promise.all(
      categories.map(async category => {
        return {
          name: category,
          soundGifs: await this.find({ filters: { category, limit: 20 } }),
        };
      })
    );
    categoriesWithSoundgifs.unshift(
      { name: "mostRecent", soundGifs: mostRecentSoundGifs },
      { name: "mostShared", soundGifs: mostSharedSoundGifs }
    );
    return categoriesWithSoundgifs;
  }

  public async create(
    payload: Partial<SoundGifEntity> & SoundGifEntityMandatoryFields
  ): Promise<SoundGifEntity> {
    this.logger.log(`SoundGifAdapter > create > called with ${payload}`);
    return await this.soundGifRepository.create(payload).save();
  }
}
