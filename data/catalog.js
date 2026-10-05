// Catálogo único de contenidos. Duraciones en segundos; clasificación: null, TP, 7, 12, 16 o 18.
(() => {
  const catalog = {};
  // Clasificaciones por colección. La primera regla que coincide es la que se aplica.
  const ratingRules = [
    ["paranormal-", "16"],
    ["three-kind-", "16"],
    ["movie-el-hotel", "16"],
    ["movie-poker-de-ases", "16"],
    ["caos-strawberry-", "12"],
    ["movie-origen-fort-brimstone", "12"],
    ["movie-fort-brimstone", "12"],
    ["movie-caida-fort-brimstone", "12"],
    ["mis-amigos-", "7"],
    ["movie-tumba-faraon-", "7"],
    ["movie-amatista", "7"],
    ["special-nuestro-primer-ano", "7"],
    ["special-summer-sound-", "TP"],
    ["movie-problemas-en-casa", "TP"]
  ];
  const ratingFor = (id) => ratingRules.find(([prefix]) => id.startsWith(prefix))?.[1] ?? null;
  const seconds = (value) => value === null ? null : value.split(":").reduce((sum, part) => sum * 60 + Number(part), 0);
  const addEpisodes = (prefix, series, block, rows) => rows.forEach(([number, duration, driveId]) => {
    const id = `${prefix}${String(number).replace(".", "-").padStart(2, "0")}`;
    const separator = " |";
    catalog[id] = {
      title: `${series}${separator} ${block} - Episodio ${number}`,
      duration: seconds(duration), rating: ratingFor(id), driveId, type: "episode", series, block, episode: number
    };
  });
  const addMovie = (id, title, duration, driveId, collection) => {
    catalog[id] = { title, duration: seconds(duration), rating: ratingFor(id), driveId, type: "movie", collection };
  };
  const addSpecial = (id, title, duration, driveId) => {
    catalog[id] = { title, duration: seconds(duration), rating: ratingFor(id), driveId, type: "special" };
  };
  const addExtra = (id, title, duration, driveId, category) => {
    const rating = category === "music" ? "16" : category === "promo" ? "7" : null;
    catalog[id] = { title, duration: seconds(duration), rating, driveId, type: "extra", category };
  };

  addEpisodes("caos-strawberry-s01e", "Caos en Strawberry", "Temporada 1", [
    [1,"7:42","1ZKNUNAaGGd7Lph7UeC7R9cetrmOr81ks"],[2,"8:37","1Eqfvtu0YXx3V4tSFXljFOb-0NDrOxvtN"],
    [3,"7:37","1Qjo1jMMUg8t909zcPDkrRvXnzCkbTc8T"],[4,"8:20","12-J2SIQl4OHLcRwu5U7xwKKt4OstSG3Y"],
    [5,"8:16","1TmgmUPE6ia3lDqska69E9KzB-6rOIpvo"],[6,"8:59","1n8NEPbE8hlreAY8MMA2ZBDKQ222b7Bro"],
    [7,"9:26","12xF4Ml8E8fAHx7eBqWzfT9WBjC-2ekft"],[8,"8:59","1lhAvIRtyOqwT-Khkewp18rfCZaO13O3K"],
    [9,"9:03","16-h5PNpn42lwvpvjQCnO-yND7GbOma27"],[10,"9:23","1BbRa4yjbkqo8zRB0k3qvrlKztfTOPqwC"],
    [11,"9:45","1Jq7yWRRUaLhZ5PN9kj5l8McI1q5CWmYs"],[12,"9:51","1VWZ6FsBbzGZWyC2wQMxbF1IwXwPqyAvx"]
  ]);

  addEpisodes("paranormal-prologo-e", "Paranormal", "Prólogo", [
    [1,"6:32","1--UASD2YqSsJ7tQjhRXT_o6QdwLbKHvJ"],[2,"7:28","1ppkiHIi8z9NLnzTBZb-NgwLeyNjuPF_D"],
    [3,"5:47","1vunqiQOfSQGr_2WbAD4GLOYaVWb30Yxy"],[4,"6:38","1fKVBcfERS506wMZmbSGj7RjEJLuxI2d5"],
    [5,"8:08","1oQkoz9wQnI50uydsNGrOX3OBTY4ydtUD"],[6,"7:33","1lJahoHVQSBwk69YAE0s1wjvVsS-YLu_A"],
    [7,"9:32","15r2YkruuAGc7Dan9s6dwGVKI3kARP9Tj"]
  ]);
  addEpisodes("paranormal-v01e", "Paranormal", "Volumen 1", [
    [1,"11:06","1NHIKnEKT4j386AokKkUCK9dTtX0VCEUd"],[2,"10:04","1Se5REB-jmK-Nfv5EpF3e0MvnIeV5PfLp"],
    [3,"10:23","1ltTv1i_nhDOyBvIEXXnURTupFvNJqzKl"],[4,"11:22","14cSGqtV5JARCgvJBpjQO9IBYGzQg7C8L"],
    [5,"12:28","1sPBWey6GmbaENpR2FEFBYNq9ktzJwVhj"],[6,"12:21","1rpGFl4Qoi_2Y-Ff0a3INuE9Sf7WWKQpr"],
    [7,"16:20","1k_Pj0mfeYJvD__X5HMyl-SBJX6WMaAoc"]
  ]);

  addEpisodes("three-kind-s01e", "Three of a Kind", "Temporada 1", [
    [1,"11:50","1sQnsMX1VlfaL5yY2IwB6hwvHyMSfcWRA"],[2,"12:47","1Z-bndabA5QWoKWMFRTbtrHsUdGa59Cz9"],
    [3,"9:55","10eIMBKHFRsTyxrSgzd3bxldcZC_ZTq4A"],[4,"13:47","1bhTJHrS3od1g5cag3-zHrQdsNWZI0t7H"],
    [5,"10:52","1-UQ7ZCiO2Ur-GlwG0zml0P2ddiy3rlI_"],[6,"13:58","1_bQ-AWZppaRGr2DtHRj2jgmHm_vErQ7i"],
    [7,"16:22","1BMrRggaCWWe_8XuscuZoIBKuc8suRlsm"],[8,"12:47","1Q-SPSLMddumIpjDJMVj7UP1-gAjL9JqC"],
    [9,"12:29","1T3cC-FlusEkNUOGcGxxaEqJB2_xBFObD"],[10,"11:15","1iZKuEJhtq_NtHcvB0WZr45JHASFiJ7wn"],
    [11,"13:26","1yeYHsvfnU37f7TEOpAgmqGgtBmamzzVm"],[12,"13:15","12RvCu26ZT-QbT7gOGEZYXzZ1YzleOtVR"],
    [13,"12:04","1_UE3RxnaW5R4zyTDI4RdB8eh7UHUPOSi"],[14,"14:03","1ZtCW6EL7CMZkGCITcwYd3UrhRWV-nP4A"]
  ]);
  addEpisodes("three-kind-s02e", "Three of a Kind", "Temporada 2", [
    [1,"12:26","1kP6BhQb9jhugEKEfexRh02t2r_7RukAa"],[2,"12:16","1m8f90irf7f8QLPg8rEyBrkR91zaBenwW"],
    [3,"12:26","1bxilpfi8Eg5db9xymNCXqxnpMCPVLj4I"],[4,"12:33","1fiqbFJaKhgSPComgk33Vg61vKEESOorN"],
    [5,"12:20","18hluE-DZHYX1g6EMHao_p6V5Fkcfv9iQ"],[6,"12:45","17ubZsRPEbupx3Gs9uy73JZEWGE5l9kxQ"],
    [7,"13:10","1u8cM5pXN6Pq6hIztaeD7lGle2pcasMdr"],[8,"12:25","1MrflHSwCv4JCNQshZ_YsSUwB5HG6w2Iw"],
    [9,"12:16","1qFONPu6oP_3xqEJEaxRQbln_gthDY9mA"],[10,"13:05","1afdRBN4nl7vs9q_ZkG0hBWKecIsSpiyJ"],
    [11,"14:07","14UZlJV4Jz9py0siOEBnIhg8QzYuCTz-c"],[12,"25:18","1mFBH88NNPeGKVGrK6CkHXivKliMXs29h"],
    [13,"12:22","1Po-sX31OFuA1Ty3KbEk38RdrF1rx2c0X"],[14,"12:56","1oVKE4Xc86IVkWScnWqR6jPhe3-VfKNLT"],
    [15,"11:52","1AKSUW755zQS4fA6CYlL2oSF2oaubuvE4"],[16,"12:08","1wvV1tTJ2xRy3N12X7Z7Z9PTAgEc8ZK03"],
    [17,"11:48","1BNpvYCLmOJItIOPX9VIV06lNd4rrGHje"],[18,"13:00","1L4xKnVVX_klDlLze4PQm7l6sY1O_EE0d"],
    [19,"14:06","1JZzrWPmXAZ13bip5qYXUHSUWMveYI4Xx"],[20,"15:07","1cftEH8x1DX7Kz6kEFi6eWbYfAxX5UeiR"],
    [21,"12:49","10_n-PAGIavc5f_KxJeUzguxf5pYoRXAG"],[22,"12:27","1JAz3tT4wE70wQO4kwhRJT7SMnIWYpnyF"],
    [23,"12:07","18HGYn8nefZ6ulS7ZcO5qAMWiLGUil-SM"],[24,"34:59","1kIgQCznrNDPhA_Qfs_ps7VvXf6HLEDmn"],
    [25,"13:23","1PphW_X7X4jZCj3N34vP62tTzicu6MuTg"],[26,"14:09","1dxSBOcD9Ha0FdVAX9_--MYflAUaPe3Pm"],
    [27,"12:20","1KJnylzaBG1Di_LnbAmE2txPTXhzgQ3gM"],[28,"13:19","1EQXvnksW1_CsZ6muMIyeN_-zZJFeEeIR"],
    [29,"11:49","16I0f0cIccAx2DAW8eDZMDof3-tmTpVLP"],["30.1","23:46","1RCmX-c5kvI7hQgLKhqE3GDPmjPAYZMWV"],
    ["30.2","46:05","11rNVQYapBHufAXTJ6nJyHph-HnfWh9VF"],[31,"11:42","1EGUuRWC790yemmD5rQfZoolXXwvUn_ir"],
    [32,"16:04","1O1SexmlJKXMYZsmA4ru3dj2NPm_nxI1S"],[33,"19:11","1IUcRQWfhTav_CmfYsz6JOiRi8CT2pVKs"],
    [34,"21:20","1uFTwU6ERh87kxJmMmMrjiN48mkLDci2o"]
  ]);

  addEpisodes("mis-amigos-s01e", "Mis Amigos", "Temporada 1", [
    [1,"8:36","1eLGa-Ja1QPNARIG4WRmSuwDIhKHH-r45"],[2,"8:33","19DLundcUYGX6yxCZXZBWxCS5DeirgekC"],
    [3,"8:40","1vb7Db9YFgk74LQc2qYUzIhZOdhk8AiXc"],[4,"8:30","1EByjV_-E_eP0qBfetQ83b4d9N7K38EzL"],
    [5,"8:30","1S3ey2zX-gRTURgviF7jWh_yvaLA1tjUX"],[6,"8:31","1Tn65AQLVk51dLIvH4YFwqXcVzygxOWhW"],
    [7,"8:35","1KjsOzNtqWAKpXUPbs7i__FBb12N5o5_i"],[8,"8:43","1AGkQhGEyxIL243y5hIvWCOGG-gQJSTBe"]
  ]);

  addMovie("movie-amatista", "Amatista", "9:00", "1CndllrV-VgjButXBsuIUCKM78d43p5bk", "Amatista");
  addMovie("movie-amatista-2", "Amatista 2", "12:13", "1pPMejQpIJZW3wJCYo07v6S8ZFiWjvjSn", "Amatista");
  addMovie("movie-problemas-en-casa", "Problemas en Casa", "5:28", "1d1_G88DAhqnPbUlH9GGdcJJ90xxbsrau", "Navidad");
  addMovie("movie-origen-fort-brimstone", "El Origen de Fort Brimstone", "10:11", "1VpdGaZaBol_K1wryUDU83SVRlwHIdxkX", "Fort Brimstone");
  addMovie("movie-fort-brimstone", "Fort Brimstone", "11:00", "13ZJ24tzrdUEhzLPfqf2p_eZwVvtHaAE7", "Fort Brimstone");
  addMovie("movie-caida-fort-brimstone", "La Caída de Fort Brimstone", "12:28", "1AK5vDcAJQNA-EW7AE1-3CFHLMLqZuAtl", "Fort Brimstone");
  addMovie("movie-el-hotel", "El Hotel", "12:09", "1W21hdio4_EQZP20TWAHed_4XL_r03R8X", "Halloween");
  addMovie("movie-poker-de-ases", "Póker de Ases", "9:05", "1Mhsdr32xwpujbppa0OvMrshFTZwH7qQb", "Halloween");
  addMovie("movie-tumba-faraon-1", "La Tumba del Faraón", "6:15", "1-d4Ai_peND-rO8Rrpvg9WjCgHUmR_OlO", "La Tumba del Faraón");
  addMovie("movie-tumba-faraon-2", "La Tumba del Faraón II", "13:10", "1aIqdEkvPLGTAZ0f5JdHN60BLqHKEyaFR", "La Tumba del Faraón");
  addMovie("movie-tumba-faraon-3", "La Tumba del Faraón III", "7:40", "1mYaj_Z2Pyj1iqhRwJ53JcSlW-u4h5vto", "La Tumba del Faraón");
  addMovie("movie-tumba-faraon-4", "La Tumba del Faraón IV", "8:30", "1pB49lT21WQ6hdfzS49W58oaBNAZP5EJ_", "La Tumba del Faraón");

  addSpecial("special-summer-sound-1", "Summer Sound 1", "25:08", "1u7E0A9WyU6BANmtHIzP9BzdYD64Xdfsx");
  addSpecial("special-summer-sound-2", "Summer Sound 2", "22:43", "1OAQfj1AhcgVE7Wc6E2f3rgv7WZ425qV5");
  addSpecial("special-summer-sound-3", "Summer Sound 3", "38:28", "1Xig8MU8-2OQT0v35E-xsNIt2MAX_RLzQ");
  addSpecial("special-summer-sound-4", "Summer Sound 4", "1:34:24", "1CARFuyomJDTmbdpbPDCWYBggvPbQWj05");
  addSpecial("special-nuestro-primer-ano", "Nuestro Primer Año", "28:46", "1GDKIVi35bkTt51fGQy0JXo14mb_GjBd9");

  // Avances autorizados para rellenar pausas (no aparecen como programas en la guía).
  addExtra("trailer-caos-s01", "Tráiler · Caos en Strawberry T1", "1:50", "16I56QiStywz4QRjO0j_-iIkf3FEzHHDg", "trailer");
  addExtra("teaser-paranormal-prologo", "Teaser · Paranormal | Prólogo", "0:32", "1hfa9DihkM3-VE6g_KITMxyS-J0_oC-LC", "trailer");
  addExtra("trailer-paranormal-v01", "Tráiler · Paranormal | Volumen 1", "2:13", "1nHYGPjwemmQyR0DlUSd1m2XGDnl2j8_I", "trailer");
  addExtra("trailer-three-kind-s01", "Tráiler · Three of a Kind T1", "1:28", "1stdCPMzsqnSlfQdRA6URWR8rYQwPbP5e", "trailer");
  addExtra("trailer-three-kind-s02", "Tráiler · Three of a Kind T2", "1:13", "1LoHbg3wrwg62AEjGwXzhRVUedRZifklM", "trailer");
  addExtra("trailer-tumba-faraon", "Tráiler · La Tumba del Faraón", "0:50", "17skylH2RIKkfTfMVIO0BTtxrum7qja7i", "trailer");
  addExtra("trailer-tumba-faraon-2", "Tráiler · La Tumba del Faraón II", "1:27", "1nL2wGH2Wj6C-YpX8-mBq7yVQAjrBHD9-", "trailer");
  addExtra("trailer-amatista-2", "Tráiler · Amatista 2", "1:00", "1JlPau4iDWQjc1H-q6BPBMD0y7_Igw7zb", "trailer");
  addExtra("trailer-el-hotel", "Tráiler · El Hotel", "1:32", "17Lfj0mghQVBSKqFRnlnMYZ8daS3FJXN7", "trailer");
  addExtra("adelanto-mis-amigos-s01", "Adelanto · Mis Amigos T1", "2:48", "1Dg1SlDhbNO5wB36WqlF2DEI0UdqJ1Blh", "trailer");

  // Contenido musical de Three of a Kind.
  addExtra("music-devuelveme-a-mi-chica", "Devuélveme a mi chica", "0:56", "1LVxbSSmm8IKt-KKGvLpZzxVQHoaaeg0C", "music");
  addExtra("music-dont-stop-believin", "Don't Stop Believin'", "3:03", "1D2cb0JLSJc51decC87PRKU6G9S9Tmghu", "music");
  addExtra("music-havana", "Havana", "3:54", "104vDwdeWeuSe1vze8m51JM0s31MS3J_f", "music");
  addExtra("music-have-you-ever-seen-the-rain", "Have You Ever Seen the Rain?", "2:32", "1-QfxDjLCwyIMBxo8Si8_k1gU3nK3uyeE", "music");
  addExtra("music-im-outta-love", "I'm Outta Love", "3:37", "13dmZZtIycwkPOtwYftKkS9xBjaES68v8", "music");
  addExtra("music-livin-on-a-prayer", "Livin' on a Prayer", "4:38", "1O-VD5ek0MnY4fueDyWYbn0Nzi1E7hf7m", "music");
  addExtra("music-livin-on-a-prayer-2", "Livin' on a Prayer 2", "4:19", "1IML3nPF6K1cBrmNHKALqjrLBpr7xw30G", "music");
  addExtra("music-manchild", "Manchild", "2:09", "1RXK8jqOjI1XbBP_6aX44Xa6KMOjz08wQ", "music");
  addExtra("music-manchild-espresso", "Manchild / Espresso", "2:59", "1_QjAMcCeUPaNbw5ORJYg-MKg5PfOKIAk", "music");
  addExtra("music-mystical-magical", "Mystical Magical", "3:02", "11JdU7dHIjAyxgLltfc6ja4pTEl9kvBBD", "music");
  addExtra("music-somethings-got-a-hold-on-me", "Something's Got a Hold on Me", "3:30", "1DuZXEv3gDTssinRI-noKTw3D4b5ZrbDm", "music");
  addExtra("music-the-boys-are-back-in-town", "The Boys Are Back in Town", "0:20", "1UuMhDb4sswQc-kgTNEt2IM-kSbPBD8j1", "music");
  addExtra("music-training-season", "Training Season", "3:40", "1egd2t2Cvt8HAnvrQ6JjD_1bkfHyapdWR", "music");
  addExtra("music-waka-waka", "Waka Waka", "2:14", "1eS9hIdGOe2JtropTvCcTVCSx-Dq8SLN-", "music");
  addExtra("music-you-belong-with-me", "You Belong With Me (Póker's Version)", "2:13", "1FJy9ZmKhkUi-lW3ifTVXM0P_3-V55wmJ", "music");

  const shuffled = (values, seed = 1) => {
    const result = [...values];
    let state = seed >>> 0;
    for (let index = result.length - 1; index > 0; index--) {
      state = (state * 1664525 + 1013904223) >>> 0;
      const target = state % (index + 1);
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  };
  const makeTrailerBreaks = (seed = 1) => {
    const pool = shuffled(Object.keys(catalog).filter((id) => catalog[id].category === "trailer"), seed);
    let cursor = 0;
    let breakNumber = 0;
    return (duration = 180) => {
      const wanted = 2 + ((seed + breakNumber++) % 2);
      const items = [];
      let used = 0;
      for (let attempts = 0; attempts < pool.length * 3 && items.length < wanted; attempts++) {
        const id = pool[cursor++ % pool.length];
        const itemDuration = catalog[id].duration + 10;
        if (!items.includes(id) && used + itemDuration <= duration) {
          items.push(id);
          used += itemDuration;
        }
      }
      return { type: "adBreak", duration, items };
    };
  };

  window.CONTENT_CATALOG = catalog;
  window.SCHEDULE_TOOLS = { shuffled, makeTrailerBreaks };
})();
