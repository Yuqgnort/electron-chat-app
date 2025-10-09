import { faker } from "@faker-js/faker";
import fs from "fs";

const TOTAL_MESSAGES = 1000;
const OUTPUT_FILE = "topic1.json";
const ARTICLE_URL =
  "https://vnexpress.net/ong-trump-ap-thue-nhap-khau-25-voi-xe-tai-4948090.html";

const baseSentences = [
  "Mình thấy việc áp thuế 25% với xe tải nhập khẩu là bước đi mạnh mẽ, nhưng có thể làm tăng chi phí vận chuyển. Nhiều doanh nghiệp logistics ở Texas và California có thể chịu ảnh hưởng nặng nề vì chi phí xăng dầu và phụ tùng đều tăng. Tuy nhiên, nếu nhìn ở góc độ chính trị thì đây lại là đòn bẩy hiệu quả cho ông Trump trước bầu cử.",
  "Theo tôi, đây là chiến lược nhằm bảo vệ ngành công nghiệp nội địa trước bầu cử. Nhưng câu hỏi là liệu nó có thực sự tạo thêm việc làm hay chỉ khiến người tiêu dùng Mỹ phải trả giá cao hơn? Các hãng xe nội địa có thể vui mừng ngắn hạn, nhưng nếu Mexico trả đũa thì hậu quả không hề nhỏ.",
  "Nếu Mexico đáp trả bằng thuế nhập khẩu từ Mỹ thì hậu quả sẽ không nhỏ. Nhất là trong bối cảnh chuỗi cung ứng Bắc Mỹ đang hồi phục sau đại dịch. Việc áp thuế qua lại có thể làm gián đoạn nguồn cung linh kiện, khiến giá xe tải và hàng hóa khác leo thang. 🛻💸",
  "Có ai biết xe tải nhẹ có bị áp thuế này không? Bài báo nói chưa rõ. Mình nghĩ nếu tính theo trọng lượng xe thì sẽ có lỗ hổng trong chính sách, khiến doanh nghiệp có thể lách luật bằng cách thay đổi thiết kế sản phẩm.",
  "Theo dữ liệu, lượng xe tải từ Mexico sang Mỹ đã tăng gấp 3 lần từ 2019. Điều đó cho thấy chuỗi cung ứng khu vực này đang lệ thuộc rất lớn vào sản xuất xuyên biên giới. Chính sách thuế kiểu này sẽ khiến các nhà máy phải tính toán lại chiến lược đầu tư.",
  "Cảm ơn đã chia sẻ bài báo này, mình gửi lại link để mọi người xem: " +
    ARTICLE_URL +
    ". Mình đọc xong thấy khá rõ ý đồ chính trị, nhưng phần phân tích tác động dài hạn thì còn mơ hồ. Nếu ai có nguồn khác từ WSJ hoặc Reuters thì chia sẻ nhé.",
  "Tôi nghĩ chính sách này chỉ có tác dụng ngắn hạn, về lâu dài sẽ gây lạm phát. Khi chi phí vận chuyển và sản xuất tăng, giá hàng tiêu dùng chắc chắn sẽ đội lên. Người lao động Mỹ cuối cùng lại là người chịu thiệt, giống như những gì đã xảy ra trong cuộc chiến thương mại 2018.",
  "Bài viết có nói về việc miễn thuế nếu linh kiện sản xuất tại Mỹ đạt 64%, điều này quan trọng đấy. Nhưng thực tế, rất ít hãng đạt tỷ lệ đó vì chuỗi cung ứng hiện nay mang tính toàn cầu. Thế nên phần lớn doanh nghiệp vẫn sẽ bị ảnh hưởng.",
  "Tác giả chưa nói rõ ảnh hưởng đến chuỗi cung ứng linh kiện, mình thấy đây là điểm mấu chốt. Nếu thiếu nguồn linh kiện từ Mexico thì các hãng xe Mỹ sẽ không thể đáp ứng sản lượng, dù có được bảo hộ bằng thuế.",
  "Mức thuế 25% sẽ giáng mạnh vào các hãng như Freightliner, Peterbilt, hay thậm chí Ford nếu họ vẫn nhập một phần linh kiện từ Mexico. Việc định vị lại nhà máy sẽ tốn kém và không thể làm trong ngày một ngày hai.",
  "Nếu các hãng xe chuyển nhà máy sang Mexico thì mục tiêu bảo hộ thất bại. Một phần sản xuất sẽ vẫn ở đó để tận dụng nhân công rẻ và chính sách thương mại tự do giữa các nước khác trong khu vực. Chính sách này có thể phản tác dụng về dài hạn.",
  "Bài này viết khá chi tiết, giúp hiểu rõ hơn về chính sách thương mại của Trump. Tuy nhiên, phần phỏng vấn chuyên gia hơi ít. Mình muốn biết thêm ý kiến của các nhà kinh tế độc lập để cân bằng góc nhìn.",
  "Mình không đồng ý, vì cuối cùng người tiêu dùng Mỹ vẫn chịu giá cao hơn. Doanh nghiệp có thể chuyển chi phí sang người mua, và điều này sẽ ảnh hưởng tới lạm phát. 😤 Theo bạn, liệu Cục Dự trữ Liên bang có phản ứng gì không?",
  "Theo mình, đây là con dao hai lưỡi — tốt cho chính trị, hại cho kinh tế. Ông Trump có thể giành được sự ủng hộ từ công nhân nhà máy, nhưng lại khiến giới tài chính lo ngại. Tác động tâm lý thị trường có thể thấy rõ ngay từ tuần sau.",
  "Haha, không ngạc nhiên, Trump vẫn luôn ưa chuộng chủ nghĩa bảo hộ 😅. Nhưng lần này có vẻ mạnh tay hơn so với 2018. Liệu Mexico có còn giữ thái độ kiềm chế không, hay sẽ phản ứng gay gắt hơn?",
];

function randomMessage() {
  const base = faker.helpers.arrayElement(baseSentences);
  const extra = faker.helpers.arrayElement([
    "Theo bạn thì sao?",
    "Ai có số liệu mới hơn không?",
    "Mình đang viết bài phân tích thêm về chủ đề này.",
    "Nếu ai có link báo tiếng Anh thì gửi nhé.",
    "Liệu đây có phải là khởi đầu cho một cuộc chiến thương mại mới?",
  ]);
  const filler = faker.helpers.arrayElement([
    "Thấy nhiều người bàn tán trên Twitter, quan điểm khá chia rẽ.",
    "Nhiều nhà đầu tư bắt đầu rút vốn khỏi lĩnh vực logistics.",
    "Chính sách kiểu này thường được dùng để lấy điểm trong chiến dịch tranh cử.",
    "Cộng đồng tài xế xe tải đang rất quan tâm đến vấn đề này.",
    "Có vẻ như truyền thông đang tập trung nhiều vào yếu tố chính trị hơn là tác động kinh tế thật sự.",
  ]);
  return `${base} ${filler} ${extra}`;
}

const data = [];

for (let i = 0; i < TOTAL_MESSAGES; i++) {
  data.push(randomMessage());
  if (i % 200 === 0 && i > 0) console.log(`✅ ${i} messages generated`);
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), "utf-8");
console.log(
  `🎉 Done! ${TOTAL_MESSAGES} enriched messages written to ${OUTPUT_FILE}`
);
