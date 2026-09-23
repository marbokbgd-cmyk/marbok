import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import styles from "./ImagesSlider.module.css";
import "swiper/css";
import "swiper/css/pagination";
import { Autoplay, Pagination } from "swiper";
import { urlFromThumbnail } from "@/utils/image";

function ImagesSlider({ images }) {
  return (
    <>
      <Swiper
        spaceBetween={30}
        centeredSlides={true}
        autoplay={{
          delay: 3500,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
        }}
        // navigation={true}
        modules={[Autoplay, Pagination]}
        className={`${styles.imgSwiper} imagesSwiper`}
      >
        {images.map(({ image, _id }) => {
          return (
            <SwiperSlide key={_id}>
              <img
                src={urlFromThumbnail(image)}
                alt="hero image"
                className={styles.image}
              />
            </SwiperSlide>
          );
        })}
      </Swiper>
    </>
  );
}
export default ImagesSlider;
