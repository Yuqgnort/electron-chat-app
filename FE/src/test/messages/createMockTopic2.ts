import { faker } from "@faker-js/faker";
import fs from "fs";

const TOTAL_MESSAGES = 4000;
const OUTPUT_FILE = "topic2.json";
const ARTICLE_URL =
  "https://vnexpress.net/nguoi-thai-nguyen-chay-lu-4948263.html";

const baseSentences = [
  "2h sáng 7/10, nghe tiếng nước sông Rong ồ ồ tràn vào nhà, chị Phạm Thị Ngà chỉ kịp hô hoán, báo động chồng con rồi trèo lên nóc nhà vệ sinh mà vẫn thấp thỏm lo sợ dòng nước sẽ cuốn trôi. Gia đình mất điện, điện thoại ướt, không thể liên lạc lâu.",
  "Tối hôm trước, nước mấp mé sân, vợ chồng chị kê đồ đạc lên cao gần một mét rồi đi ngủ. Không ngờ chỉ vài giờ sau, tầng một đã bị ngập ngang bụng. Họ phải leo lên mái xi măng để tránh lũ.",
  "Cả hai ngôi nhà đều nằm sát bờ sông, khi nước dâng nhanh khiến người dân bị cô lập hoàn toàn. Họ không đủ thời gian để mang theo đồ đạc, chỉ biết chờ cứu hộ từ trên nóc nhà.",
  "Gia đình chị Trần Thị Thu phải dồn nhau lên tầng hai của nhà người thân vì nhà riêng bị ngập hoàn toàn. Trong đêm mưa gió, điện thoại chập chờn, thức ăn không mang theo, họ phải nhịn đói chờ bình minh.",
  "Ở khu xóm La Hiên (Võ Nhai), nhà anh Nguyễn Văn Tuyến cũng bị ngập; dù đất cao hơn, nước vẫn tràn vào tầng một. Dòng nước cuốn đi nhiều tài sản, người dân bơi lội, bám tường di chuyển khi nước lên cao.",
  "Theo ghi nhận, lượng mưa từ 19h hôm trước đến 7h sáng tại Hóa Thượng lên đến 526 mm, Đồng Quang 446 mm, các vùng khác cũng vượt ngưỡng. Mưa lớn liên tục khiến lũ nhiều sông tại Thái Nguyên vượt báo động 3. Chính quyền địa phương đã ra công điện khẩn, huy động quân, công an, dân quân đi cứu trợ.",
  "Nhiều người kêu cứu trên mạng xã hội vì bị mắc kẹt, sóng điện thoại yếu, pin đang cạn dần. Họ gửi ảnh nhà ngập, cầu xin thuyền cứu hộ vào khu trong nhưng đường nước xiết không tiếp cận nổi.",
  "Một số hộ dân phải trèo lên mái nhà, gác xép trong đêm rét, co ro dưới tấm bạt mỏng. Có gia đình có trẻ nhỏ, người già — nỗi lo càng nhân lên khi nước dâng cao không ngừng.",
  "Tại phường Gia Sàng, nhiều nhà trọ bị ngập tới cổ, đồ đạc nổi lềnh bềnh. Người dân bơi qua dòng nước đục ngầu, bật khóc khi tài sản bị cuốn trôi. Họ chỉ kịp mang theo vài bộ quần áo.",
  "Lực lượng cứu hộ đã được huy động: cán bộ, chiến sĩ lội nước tiếp cận, dùng xuồng vào các hẻm ngập, đưa người già và trẻ nhỏ ra an toàn. Nhưng có nơi nước chảy xiết, việc tiếp cận rất khó khăn.",
  "Tình trạng cô lập kéo dài hàng giờ: người dân không thể đi lại, bị mất liên lạc, không có thực phẩm, chờ đợi đội cứu hộ tiếp cận. Nhiều người lo sợ nếu ban đêm nước tiếp tục dâng sẽ nguy hiểm đến tính mạng.",
  "Sau khi lũ rút, người dân Thái Nguyên phải dọn dẹp hàng loạt vệ sinh, vớt đồ hư hỏng, khử trùng, sửa nhà. Nhiều gia đình mất trắng tài sản, phải nhận hỗ trợ lương thực, quần áo, màn, chiếu từ tổ chức xã hội.",
  "Cảnh tượng cắt lòng khi nhiều hộ nuôi gà, heo, cá bị mất hết, chuồng trại ngập sâu. Những nông hộ vốn khó khăn nay lâm vào nợ nần, phải nhờ vay vốn ưu đãi để khôi phục sản xuất.",
  "Có người dân chia sẻ: “Chúng tôi chỉ mong một đêm yên tĩnh, không mưa, để nước rút, để lực lượng vào cứu.” Nỗi lo “nước lên nữa” luôn ám ảnh trong tâm trí họ trong đêm dài co ro.",
  "Trung thu về, người dân Thái Nguyên không vui. Họ không bánh kẹo, không ánh đèn trang trí — chỉ là bóng tối lặng lẽ và tiếng mưa rơi chưa biết khi nào dứt.",
  ARTICLE_URL,
];

function randomMessage() {
  const base = faker.helpers.arrayElement(baseSentences);
  const filler = faker.helpers.arrayElement([
    "Chúng tôi mong báo chí phản ánh kịp thời để hỗ trợ đến nơi nhanh hơn.",
    "Ai có hình ảnh hoặc video từ hiện trường chia sẻ lên đây nha.",
    "Nhiều nhà hảo tâm đăng tin hỗ trợ lương thực, đồ cứu trợ.",
    "Mong địa phương ưu tiên hỗ trợ người già, người yếu trong những vùng cô lập.",
    "Liệu có thể dự báo sớm hơn để người dân chủ động di chuyển không?",
  ]);
  const extra = faker.helpers.arrayElement([
    "Theo bạn thì sao?",
    "Ai có số liệu mới không?",
    "Cảm ơn đã chia sẻ.",
    "Mình đang tổng hợp tin để gửi báo cáo.",
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
  `🎉 Done! ${TOTAL_MESSAGES} enriched messages for topic2 written to ${OUTPUT_FILE}`
);
