import type { Language } from '../types'

/** Vietnamese messages */
const vi: Language = {
  app: {
    settings: 'Cài đặt',
    help: 'Trợ giúp',
    fileMenu: 'Tệp'
  },
  settingsDialog: {
    title: 'Cài đặt',
    close: 'Đóng (Esc)',
    language: 'Ngôn ngữ',
    languageHint: 'Chọn ngôn ngữ giao diện. Các thay đổi được lưu tự động.'
  },
  helpCenter: {
    title: 'Trung tâm trợ giúp',
    close: 'Đóng (Esc)',
    loading: 'Đang tải…',
    empty: 'Không có tài liệu trợ giúp nào',
    pickNode: 'Chọn một nút ở bên trái',
    groupNodes: 'Các loại nút',
    about: 'Giới thiệu về Finder+'
  },
  helpDialog: {
    title: 'Hướng dẫn',
    close: 'Đóng (Esc)'
  },
  minimap: {
    dragToMove: 'Kéo để di chuyển bản đồ nhỏ',
    expand: 'Mở rộng bản đồ nhỏ',
    collapse: 'Thu gọn bản đồ nhỏ',
    zoomIn: 'Phóng to',
    zoomOut: 'Thu nhỏ',
    reset: 'Đặt lại'
  },
  palette: {
    addNode: 'Thêm nút'
  },
  connection: {
    selfLoop: 'Không thể kết nối các cổng trên cùng một nút',
    failed: 'Kết nối thất bại: {reason}',
    alreadyBound: 'Hai cổng này đã được kết nối',
    kindNotAllowed: 'Không khớp loại: cổng đầu vào này không chấp nhận loại này',
    singlePortOccupied: 'Cổng đầu vào này chỉ chấp nhận một kết nối. Hãy ngắt kết nối hiện có trước'
  },
  valueKind: {
    bool: 'Boolean',
    number: 'Số',
    string: 'Chuỗi',
    json: 'JSON',
    file: 'Tệp',
    'txt-file': 'Tệp văn bản',
    'img-file': 'Tệp hình ảnh'
  },
  intro: {
    whatIs: {
      title: 'Đây là gì?',
      body: 'Finder+ là một ứng dụng máy tính để bàn {arch} được xây dựng bằng Electron + Vue 3. Kéo các loại nút khác nhau lên cảnh và nối chúng lại với nhau để tạo thành một đường ống luồng dữ liệu — dữ liệu chảy từ các nút thượng nguồn dọc theo các cạnh đến các nút hạ nguồn, và mỗi nút biến đổi, kiểm tra hoặc tạo ra giá trị tại vị trí của chính nó.',
      arch: 'dựa trên nút / dựa trên bảng'
    },
    concepts: {
      title: 'Các khái niệm cốt lõi',
      node: {
        name: 'Nút',
        desc: 'Một đơn vị chức năng trên cảnh. Mỗi nút có loại riêng (như {c1}, {c2}, {c3}), với các cổng đầu vào ở bên trái và cổng đầu ra ở bên phải. Các nút không thao tác trực tiếp trên cảnh — chúng chỉ quan tâm đến những giá trị nhận được và những giá trị tạo ra.'
      },
      port: {
        name: 'Cổng',
        desc: 'Các chấm nhỏ ở hai bên của một nút. {input} (bên trái) nhận giá trị từ thượng nguồn, {output} (bên phải) đẩy giá trị xuống hạ nguồn. Mỗi cổng có một ràng buộc loại ({c1}, {c2}, {c3}, v.v.), và loại được kiểm tra theo thời gian thực khi kết nối.',
        input: 'Cổng đầu vào',
        output: 'Cổng đầu ra'
      },
      edge: {
        name: 'Cạnh',
        desc: 'Một đường nối cổng đầu ra với cổng đầu vào. Các giá trị chảy dọc theo các cạnh từ trái sang phải. Kéo từ chấm của cổng đầu ra đến chấm cổng đầu vào của nút khác để tạo kết nối.'
      },
      scene: {
        name: 'Cảnh',
        desc: 'Vùng chứa tất cả các nút và cạnh trên cảnh. Nó xử lý việc thêm và xóa nút, liên kết và hủy liên kết cạnh, đồng thời phát các thay đổi đến lớp UI để làm mới.'
      }
    },
    quickStart: {
      title: 'Bắt đầu nhanh',
      step1: 'Nhấp vào {plus} ở góc trên bên trái để mở bảng nút, sau đó kéo một nút lên cảnh',
      step2: 'Thả một tệp sẽ tự động phát hiện loại của nó và tạo nút File tương ứng',
      step3: 'Kéo từ cổng đầu ra của một nút (chấm bên phải) đến cổng đầu vào của nút khác (chấm bên trái) để vẽ kết nối',
      step4: 'Nhấp đúp vào một nút, hoặc nhấp vào biểu tượng bánh răng trên đó, để cấu hình tham số của nút',
      step5: 'Nếu một nút đã cấu hình {help}, hãy nhấp vào biểu tượng dấu hỏi để xem hướng dẫn sử dụng chi tiết của nút đó'
    },
    nodeTypes: {
      title: 'Tổng quan về các loại nút',
      category: 'Danh mục',
      common: 'Nút phổ biến',
      sep: ', ',
      input: 'Đầu vào',
      process: 'Xử lý',
      output: 'Đầu ra / Hiển thị',
      container: 'Vùng chứa',
      footer: 'Danh sách "Trợ giúp nút" ở bên trái hiển thị các nút hiện có tài liệu trợ giúp được đăng ký. Nhấp vào một mục để xem hướng dẫn sử dụng chi tiết.'
    }
  }
}

export default vi
