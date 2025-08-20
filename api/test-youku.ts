import { YoukuCrawler } from './crawler/youku.js';

async function testYoukuCrawler() {
  const crawler = new YoukuCrawler();
  
  try {
    console.log('开始测试优酷爬虫...');
    
    // 获取短剧列表（会自动初始化浏览器）
    const dramas = await crawler.getDramaList();
    
    console.log(`成功获取到 ${dramas.length} 个短剧:`);
    dramas.forEach((drama, index) => {
      console.log(`${index + 1}. ${drama.title} - ${drama.source_url}`);
    });
    
    console.log('\n测试完成！');
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    // 清理资源
    await crawler.close();
  }
}

// 运行测试
testYoukuCrawler().catch(console.error);