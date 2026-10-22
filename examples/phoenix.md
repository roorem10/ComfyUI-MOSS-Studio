# Phoenix showcase prompt

![Phoenix illustration generated through MOSS Image Studio](../docs/images/EXAMPLE_IMAGE.png)

This is the prompt supplied for the showcase image in the README. The positive and negative prompts are also available as plain text: [positive](phoenix-positive.txt) and [negative](phoenix-negative.txt).

## Positive prompt

```text
A cinematic widescreen anime illustration of an adult silver-haired swordswoman standing on a rain-soaked rooftop above a futuristic city at night, moments after summoning an enormous celestial phoenix.

Frame her from the knees upward, slightly left of center, viewed from a dramatic low angle. She has sharp amber eyes, a confident expression, and long silver hair streaming to the right in the wind. She wears an elegant black combat outfit beneath a flowing deep emerald coat with restrained gold embroidery. Her right hand holds a luminous golden sword pointing diagonally downward, its blade clearly separated from her body.

Behind her, a gigantic phoenix made of molten gold light and translucent crimson feathers spreads its wings across the sky. Its wings form a sweeping arc around her silhouette, framing her rather than obscuring her. Individual feathers dissolve into bright embers and delicate trails of golden particles. The phoenix has a clearly defined head, curved beak and elegant feathered wings.

Far below, a dense city of glass towers glows with cyan and violet neon. Rain, low clouds and atmospheric haze create depth between the buildings. A small illuminated rooftop sign in the middle distance reads exactly “MOSS” in clean white uppercase letters.

Warm golden light from the phoenix illuminates her face, hair and coat edges. Cool cyan light rises from the city beneath her. Wet rooftop surfaces reflect both colors. Keep her face crisp, expressive and clearly visible against a darker section of sky.

Polished contemporary anime key visual, precise linework, sophisticated cel shading, richly painted architecture, strong cinematic contrast, luminous atmospheric effects and carefully controlled detail. One human character, one phoenix, an immediately readable composition. No title overlay, no border, no watermark.
```

## Negative prompt

```text
worst quality, blurry, bad anatomy, extra fingers, extra limbs, duplicate person, malformed hands, distorted face, cluttered composition, overexposed face, watermark, jpeg artifacts
```

## Settings visible in the supplied screenshot

| Setting | Value |
| --- | --- |
| Method | Text to image |
| Model | moss_image_sft_bf16.safetensors |
| Output width × height | 2560 × 1440 |
| Steps | 100 |
| Image count | 1 |
| UI elapsed time | 8:24 |

The supplied example PNG is 2048 × 1152. Not every advanced setting is visible in the screenshot, and the supplied PNG has no generation metadata. These files therefore do not establish an exact reusable seed/model-environment snapshot.

## Load the starter preset

Download [phoenix-starter.json](phoenix-starter.json), then click **Open project** in MOSS Studio and select it. The preset uses this prompt with **1344 × 768**, **50 steps**, **CFG 3**, **Euler / sgm_uniform**, **denoise 1** and **seed 42**. Select installed filenames for your model, encoder and VAE if they differ.

This is a convenient starting point, not an exact export of the displayed render. For a first memory test, reduce the size to 768 × 768 and keep one image. For settings closer to the screenshot, set 2560 × 1440 and 100 steps after confirming the render fits your machine.
