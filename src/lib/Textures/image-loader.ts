import sharp from "sharp";

export async function loadImageUNORM8(path: string): Promise<{
    width: number;
    height: number;
    data: Uint8Array;  // RGB UNORM8
}> {
    const { data, info } = await sharp(path)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const hasAlpha = info.channels === 4;

    if (hasAlpha) {
        console.warn("Image with alpha channel detected:",path)
    }

    return { width: info.width, height: info.height, data: data };
}