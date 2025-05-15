const biomeObjLookup =
{
    "high":
    {
        "high"://temp
        {
            "high"://humidity
            {

            },
            "low":
            {

            }
        },
        "low":
        {
            "high":
            {

            },
            "low":
            {

            }
        }
    },
    "low":
    {
        "high":
        {
            "high":
            {

            },
            "low":
            {

            }
        },
        "low":
        {
            "high":
            {

            },
            "low":
            {

            }
        }
    },
}
enum biomes {
    "Plains",
    "Desert",
    "Arctic",
    "Coast",
    "Jungles",
    "Forest",
    "Oceans",
    "Mountains"
    //rivers arent gonna be a biome they're a direct result of erosion simulation. 
    //
}
enum blocks {
    "dirt",
    "grass",
    "sand",
    "grassBlock",
    "ice",
    "water",
    "stone",
    "leaves",
    "wood",
    "lava",
    "flowers", //idk which flowers

}
export { biomes, blocks, biomeObjLookup }