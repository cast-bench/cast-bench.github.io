# CaST-Bench 网站操作手册

## 添加新的 Dataset Samples 视频

### 第一步：确认 video_id 和 question_index

在 `generated_data/05_outputs/dataset/castbench_gt.json` 中找到想展示的条目，记下其 `video_id`（如 `sav_000001`）和 `question_index`（如 `1`）。

### 第二步：渲染视频

在项目根目录执行：

```bash
bash website/render.sh <video_id> <question_index> [question_index ...]
```

示例：

```bash
# 渲染单个问题
bash website/render.sh sav_000001 1

# 同一个视频渲染多个问题
bash website/render.sh sav_000001 1 4 6
```

渲染完成后，`website/videos/` 目录下会生成两个文件：

- `<video_id>_q<N>.mp4` — 已烧录 bounding box 的正方形压缩视频（640×640）
- `<video_id>_q<N>.json` — 问题、答案、选项、证据链数据

### 第三步：在 index.html 中注册

打开 `website/index.html`，找到底部的 `window.CAST_SAMPLES` 数组，添加对应的 JSON 路径：

```js
window.CAST_SAMPLES = [
  'videos/sav_000001_q1.json',
  'videos/sav_000005_q6.json',
  'videos/sav_000003_q2.json',  // 新增
  // 继续添加...
];
```

数组中的顺序即为网页上 Prev / Next 的浏览顺序。

### 注意事项

- 渲染需要 `ffmpeg` 可用（版本 7.0.2-static 已验证）
- 源视频须存在于 `generated_data/05_outputs/dataset/videos/` 目录
- 渲染完成的 `.mp4` 和 `.json` 文件需一并 commit 进 GitHub repo，才能在 GitHub Pages 上访问
- 每个样本文件较小（640×640，crf=28），可直接放入 repo
