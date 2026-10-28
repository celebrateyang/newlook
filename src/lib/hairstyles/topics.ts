export const HAIRSTYLE_TOPICS = [
  {
    slug: "french-bob", en: {
      title: "Would a French bob work for my hair?", description: "Explore a jaw-length French bob: shape, fine-hair considerations, curl shrinkage, styling and questions to take to your stylist.",
      intro: "A French bob is a compact bob around the jaw, often paired with a fringe and a softly textured finish. The outline matters more than copying an exact photo: the dry length, natural fall and amount of weight left at the ends determine how it sits.",
      considerations: ["For finer hair, discuss retaining a strong perimeter rather than removing a lot of internal weight.", "For curls or coils, check the dry resting length and shrinkage before choosing a jaw-level cut.", "A fringe may need separate daily attention. Ask how it behaves without blow-drying, especially around cowlicks."],
      ask: "Where will the perimeter and fringe sit when dry? How much hair will be removed, and can you show me a finish I can repeat at home?",
    }, zh: {
      title: "法式波波头适合我的头发吗？", description: "了解法式波波头的下颌轮廓、细软发与卷发注意点、打理需求，以及剪发前该问理发师的问题。",
      intro: "法式波波头通常在下颌附近形成紧凑轮廓，可搭配刘海和柔和纹理。决定落地效果的关键包括干发时的长度、自然垂落及发尾保留的厚度，不能只照搬参考照片的位置。",
      considerations: ["细软发可以先讨论保留发尾轮廓厚度，避免为了层次移除过多内部重量。", "卷发需要先确认干发落点和回缩，再决定是否剪到下颌。", "刘海可能需要额外打理。尤其有发旋时，应先看不吹整时的状态。"],
      ask: "干发后轮廓和刘海会落在哪里？会剪掉多少长度？能否示范一个我在家能重复的造型方法？",
    },
  },
  {
    slug: "curtain-bangs", en: {
      title: "Should I try curtain bangs?", description: "Consider curtain bangs before cutting: natural parting, fringe growth direction, blending and the daily styling routine.",
      intro: "Curtain bangs open around a centre or near-centre part and blend into longer face-framing pieces. They can change how hair frames the face without requiring a large change to the overall length. The shortest point should follow natural fall and the amount of styling you want.",
      considerations: ["Start the discussion with your natural part rather than assuming a perfectly centred split.", "Ask your stylist to check cowlicks and fringe growth direction before choosing the shortest pieces.", "The swept-away shape in a preview may require brushing or heat styling. If you want wash-and-go hair, ask to see the unstyled fall."],
      ask: "Can we start longer and refine when dry? How will the fringe fall without styling, and how will it connect to my existing layers?",
    }, zh: {
      title: "我适合剪八字刘海吗？", description: "剪八字刘海前，了解自然分缝、刘海生长方向、衔接层次和每天打理需要确认的事情。",
      intro: "八字刘海从中分或接近中分的位置打开，与两侧较长的修饰脸型发束衔接，可以在不大幅改变整体发长的情况下调整脸周轮廓。最短位置应结合自然垂落和你愿意投入的打理时间。",
      considerations: ["从你平时自然形成的分缝开始讨论，不必强行做成完全居中的分缝。", "决定最短发束前，请理发师检查发旋及前额头发的生长方向。", "效果图里向外翻的弧度可能需要吹整；如果希望洗后自然干，应先看不造型的垂落方式。"],
      ask: "能否先留长一点，等干发后再调整？不造型时会怎样落下？如何与我现有的层次接起来？",
    },
  },
  {
    slug: "textured-crop", en: {
      title: "Is a textured crop easy to maintain?", description: "Explore a textured crop: top length, fringe direction, crown growth patterns and a realistic low-effort finish.",
      intro: "A textured crop keeps a compact outline with separated texture on top and a shorter fringe. A neat silhouette does not automatically mean no styling: natural growth direction, density and the amount of texture removed affect how it behaves each morning.",
      considerations: ["Retain enough top length to create texture instead of making the crown so short it stands up.", "Discuss the fringe direction and taper level explicitly; a soft taper does not require a skin fade.", "If visible density is lower, avoid excessive thinning that increases scalp visibility. Ask to see the finish with a small amount of product."],
      ask: "How will the crown sit after sleeping or washing? Can I reproduce the texture in five minutes, and how often should the outline be refreshed?",
    }, zh: {
      title: "纹理短碎发容易打理吗？", description: "了解纹理短碎发的头顶长度、刘海方向、发旋与轮廓维护，判断它是否符合你的日常打理习惯。",
      intro: "纹理短碎发以紧凑轮廓、头顶分束纹理和较短刘海为特点。轮廓整洁不等于完全不用打理；头发生长方向、真实发量和打薄程度都会影响每天的状态。",
      considerations: ["头顶保留足够长度形成纹理，避免发旋附近剪得过短而翘起。", "明确刘海朝向和两侧渐层高度；柔和渐层不必等同于贴皮渐层。", "可见发量偏少时，避免过度打薄增加头皮可见度，并看看少量造型产品下的效果。"],
      ask: "睡醒或洗后头顶会怎样？能否在五分钟内重复这个纹理？两侧轮廓大约多久需要修整？",
    },
  },
] as const;
export function hairstyleTopic(slug: string) { return HAIRSTYLE_TOPICS.find(topic => topic.slug === slug); }
