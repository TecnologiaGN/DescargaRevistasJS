const originalLinks = [
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=2&scale=181&left=400&top=200&right=600&bottom=400&ticket=ABHniQ9ApGgWYbqWHCcSNPY%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=2&scale=181&left=400&top=0&right=600&bottom=200&ticket=ABHniQ9ApGgWYbqWHCcSNPY%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=2&scale=181&left=600&top=0&right=754&bottom=200&ticket=ABHniQ9ApGgWYbqWHCcSNPY%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=2&scale=181&left=200&top=0&right=400&bottom=200&ticket=ABHniQ9ApGgWYbqWHCcSNPY%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=2&scale=181&left=200&top=200&right=400&bottom=400&ticket=ABHniQ9ApGgWYbqWHCcSNPY%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=2&scale=181&left=600&top=200&right=754&bottom=400&ticket=ABHniQ9ApGgWYbqWHCcSNPY%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=2&scale=181&left=0&top=200&right=200&bottom=400&ticket=ABHniQ9ApGgWYbqWHCcSNPY%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=2&scale=181&left=200&top=400&right=400&bottom=600&ticket=ABHniQ9ApGgWYbqWHCcSNPY%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=2&scale=181&left=0&top=0&right=200&bottom=200&ticket=ABHniQ9ApGgWYbqWHCcSNPY%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=2&scale=181&left=600&top=400&right=754&bottom=600&ticket=ABHniQ9ApGgWYbqWHCcSNPY%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=2&scale=181&left=400&top=400&right=600&bottom=600&ticket=ABHniQ9ApGgWYbqWHCcSNPY%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=2&scale=181&left=0&top=400&right=200&bottom=600&ticket=ABHniQ9ApGgWYbqWHCcSNPY%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=3&scale=181&left=600&top=200&right=754&bottom=400&ticket=AFCFpDf2Q1Zk6rOXzqY8jao%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=3&scale=181&left=400&top=0&right=600&bottom=200&ticket=AFCFpDf2Q1Zk6rOXzqY8jao%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=3&scale=181&left=600&top=400&right=754&bottom=600&ticket=AFCFpDf2Q1Zk6rOXzqY8jao%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=3&scale=181&left=0&top=400&right=200&bottom=600&ticket=AFCFpDf2Q1Zk6rOXzqY8jao%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=3&scale=181&left=200&top=0&right=400&bottom=200&ticket=AFCFpDf2Q1Zk6rOXzqY8jao%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=3&scale=181&left=400&top=400&right=600&bottom=600&ticket=AFCFpDf2Q1Zk6rOXzqY8jao%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=3&scale=181&left=0&top=0&right=200&bottom=200&ticket=AFCFpDf2Q1Zk6rOXzqY8jao%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=3&scale=181&left=0&top=200&right=200&bottom=400&ticket=AFCFpDf2Q1Zk6rOXzqY8jao%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=3&scale=181&left=400&top=200&right=600&bottom=400&ticket=AFCFpDf2Q1Zk6rOXzqY8jao%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=3&scale=181&left=200&top=200&right=400&bottom=400&ticket=AFCFpDf2Q1Zk6rOXzqY8jao%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=3&scale=181&left=600&top=0&right=754&bottom=200&ticket=AFCFpDf2Q1Zk6rOXzqY8jao%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=3&scale=181&left=200&top=400&right=400&bottom=600&ticket=AFCFpDf2Q1Zk6rOXzqY8jao%3D',
    'https://i.prcdn.co/img?file=20092024112000000000001001&page=4&scale=181&left=200&top=400&right=400&bottom=600&ticket=AFCFpDf2Q1Zk6rOXzqY8jao%3D'
  ];
  
  let paginaAEvaluar = 4;
  console.log(paginaAEvaluar);
  for (let i = 0; i < originalLinks.length; i++) {
    if (originalLinks[i].includes(`page=${paginaAEvaluar}`)) {
        console.log('NO HAY MÁS PÁGINAS.');
      break;  // No es necesario seguir buscando si ya encontramos uno
    } else {
        console.log('f muchacho')
    }
  }
  
  