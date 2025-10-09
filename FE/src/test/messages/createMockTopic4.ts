import { faker } from "@faker-js/faker";
import fs from "fs";

const TOTAL_MESSAGES = 4000;
const OUTPUT_FILE = "topic4.json";
const ARTICLE_URL =
  "https://vnexpress.net/ldbd-chau-a-malaysia-co-the-bi-xu-thua-viet-nam-0-3-4948155.html";

const baseSentences = [
  `Tổng thư ký AFC Windsor John Paul nói rằng nếu Malaysia sử dụng cầu thủ không đủ tư cách thì trận đấu sẽ bị hủy kết quả và Việt Nam được xử thắng 3-0.`,
  `Theo điều lệ AFC, đội dùng cầu thủ không hợp lệ sẽ bị xử thua 0-3 — quy định rõ ràng nếu vi phạm nghiêm trọng.`,
  `FIFA đã công bố bằng chứng cáo buộc Malaysia làm giả giấy khai sinh để nhập tịch cầu thủ, ảnh hưởng đến tư cách thi đấu.`,
  `FAM phản ứng mạnh, cho rằng lập luận của FIFA không công bằng và sẽ kháng cáo bản án sơ bộ.`,
  `Nhiều người lo lắng nếu Malaysia bị xử thua, bảng F vòng loại Asian Cup có thể thay đổi cục diện.`,
  `Luật kỷ luật của AFC nêu rõ rằng Ủy ban kỷ luật sẽ quyết định dựa vào mức độ vi phạm và bằng chứng được xác minh.`,
  `Một số cổ động viên nói đây là vụ việc nghiêm trọng, ảnh hưởng đến uy tín của bóng đá Malaysia.`,
  `Có người hỏi: liệu Việt Nam có chắc “được” 3 điểm nếu Malaysia thắng bị xử thua?`,
  `Nếu kháng cáo của FAM thành công, có thể kết quả sẽ được phục hồi hoặc có án xử nhẹ hơn.`,
  `Nhiều chuyên gia luật bóng đá cảnh báo rằng quy trình tố tụng phải minh bạch, nếu không dễ gây tranh cãi.`,
  `Việc này giống như các vụ xử thua 0-3 trong quá khứ khi phát hiện cầu thủ nhập tịch sai luật.`,
  `Nếu Malaysia bị xử thua 0-3, Việt Nam sẽ hưởng lợi lớn — không chỉ 3 điểm mà còn tác động tâm lý mạnh.`,
  `Tình huống rất nhạy cảm — nếu các bên không đồng thuận, có thể vụ việc kéo dài đến CAS (Tòa Trọng tài Thể thao).`,
  `Một số bình luận trên mạng cho rằng Malaysia nên công khai toàn bộ giấy tờ để minh bạch.`,
  `Người hâm mộ Việt Nam đang chờ đợi công bố cuối cùng từ AFC và FIFA.`,
  ARTICLE_URL,
];

function randomMessage() {
  const base = faker.helpers.arrayElement(baseSentences);
  const filler = faker.helpers.arrayElement([
    "Theo bạn thì sao?",
    "Ai có bản gốc điều lệ AFC không?",
    "Mình muốn xem toàn văn phán quyết nếu có.",
    "Cổ động viên Malaysia chắc tức lắm.",
    "Việc này có thể trở thành án lệ trong bóng đá châu Á.",
  ]);
  const extra = faker.helpers.arrayElement([
    "Nhiều người đang bàn tán trên Twitter, bình luận rất gay gắt.",
    "Nếu Việt Nam thắng sân khách mà được xử 3-0 thì thật bất ngờ.",
    "Có thể vụ việc sẽ gây khủng hoảng trong nội bộ FAM.",
    "Nếu CAS nhận đơn kháng cáo thì thời gian xử án sẽ kéo dài.",
    "Liệu AFC có công bố toàn bộ tài liệu điều tra không?",
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
  `🎉 Done! ${TOTAL_MESSAGES} enriched messages for topic4 written to ${OUTPUT_FILE}`
);
