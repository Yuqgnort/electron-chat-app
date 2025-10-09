import { faker } from "@faker-js/faker";
import fs from "fs";

const TOTAL_MESSAGES = 1000;
const OUTPUT_FILE = "topic3.json";
const ARTICLE_URL =
  "https://vnexpress.net/gia-vang-moi-nhat-hom-nay-ngay-7-10-4948270.html";

const baseSentences = [
  `Theo bài viết, sáng 7/10, **SJC** niêm yết vàng miếng ở mức **138,6 - 140,6 triệu đồng/lượng**, tăng 500.000 đồng so với hôm qua. Giá nhẫn SJC cũng leo lên 135 - 137,7 triệu đồng/lượng.`, // từ bài gốc :contentReference[oaicite:0]{index=0}
  `Cùng thời điểm, DOJI và PNJ cũng điều chỉnh tăng giá vàng miếng theo xu hướng thị trường, chênh lệch mua - bán dao động khoảng 2 triệu đồng mỗi lượng.`,
  `Giá vàng thế giới đóng vai trò dẫn dắt: hiện đang ở vùng 3.960–3.980 USD/ounce, hỗ trợ đà tăng trong nước.`,
  `Một số chuyên gia cảnh báo rằng nếu USD mạnh lên hoặc lợi suất trái phiếu Mỹ tăng cao, vàng có thể chịu áp lực điều chỉnh ngắn hạn.`,
  `Các quỹ ETF vàng ghi nhận dòng vốn mới đổ vào trong tuần qua, cho thấy thị trường đang quan tâm vàng như tài sản trú ẩn an toàn.`,
  `Người mua nhỏ lẻ thường lo lắng “mua vàng bây giờ có kịp không?”, đặc biệt khi đà tăng đã khá mạnh liên tục nhiều phiên.`,
  `Nếu Fed bất ngờ quyết định giữ lãi suất cao hoặc lạm phát bất ngờ tăng, vàng có thể lùi bước tạm thời trước áp lực kỹ thuật.`,
  `Có người đặt câu hỏi: liệu vàng có vượt mốc 4.000 USD/ounce trong thời gian tới không?`,
  `Một số cửa hàng vàng tại TP.HCM đã treo biển “bán vàng miếng tăng 500.000 đồng/ngày” để thu hút khách quan tâm nhanh.`,
  `Mặc dù vàng trong nước tăng mạnh, nhưng khoảng cách so với giá quốc tế quy đổi (theo tỷ giá ngân hàng) vẫn còn khoảng 10–14 triệu đồng mỗi lượng.`,
  `Thị trường vàng mấy ngày tới được dự báo biến động mạnh, nhà đầu tư nên theo dõi sát USD, lãi suất, và các thông tin từ Fed.`,
  `Tâm lý FOMO đang xuất hiện: nhiều người muốn mua nhanh trước khi giá vượt “đỉnh” để không lỡ cơ hội.`,
  `Một số người bán trước: “Này là thời điểm chốt lời, giữ vàng lâu dễ chịu rủi ro”.`,
  `Nếu bạn có dự báo từ các ngân hàng hoặc tổ chức tài chính quốc tế, chia sẻ nhé để mọi người cùng theo dõi.`,
  ARTICLE_URL,
];

function randomMessage() {
  const base = faker.helpers.arrayElement(baseSentences);
  const filler = faker.helpers.arrayElement([
    "Theo bạn thì sao?",
    "Ai có biểu đồ giá mới không?",
    "Mình đang tổng hợp để gửi cho bạn bè.",
    "Nếu ai có link tiếng Anh thì chia sẻ nha.",
    "Cảm ơn đã chia sẻ bài viết.",
    "Hy vọng vàng không lao dốc bất ngờ.",
    "Nên mua vàng bây giờ hay chờ điều chỉnh?",
  ]);
  const extra = faker.helpers.arrayElement([
    "Thị trường hôm nay biến động rất mạnh.",
    "Nhiều người nhắn tin hỏi giá vàng mỗi giờ.",
    "Một số trang mạng dự báo vàng có thể lên nữa.",
    "Có người bảo mua tích trữ, có người bảo bán ngay.",
    "Không biết lãi suất trong nước có ảnh hưởng nhiều không?",
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
  `🎉 Done! ${TOTAL_MESSAGES} enriched messages for topic3 written to ${OUTPUT_FILE}`
);
