"use client";
import clsx from "clsx";
import { useState, useRef } from "react";

import NavModal from "@/components/NavModal/NavModal";
import SvgHamburger from "@/components/SvgHamburger/SvgHamburger";
import Dropdown from "@/components/Dropdown/Dropdown";

import styles from "./NavigationMobile.module.css";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { HiHome } from "react-icons/hi2";
import { GrCatalog } from "react-icons/gr";
import { MdContactMail } from "react-icons/md";
import { BsFillPeopleFill } from "react-icons/bs";
import { IoMdArrowDropdown } from "react-icons/io";
import { useAuth } from "@/hooks/useAuth";
import { useGetCurrentUser } from "@/hooks/useGetCurrentUser";
import { UserAvatar } from "../UserAvatar/UserAvatar";
import { FaUser } from "react-icons/fa";
import CatalogExportButton from "@/components/CatalogExportButton/CatalogExportButton";

export const revalidate = 10;

function NavigationMobile({
    category,
    categories,
    isAdmin,
    showCatalogExport = false,
}) {
    const { authUser: user, signOutUser } = useAuth();
    const { data: userData } = useGetCurrentUser({ uid: user?.uid ?? null });
    const handleSignOut = async () => {
        try {
            await signOutUser();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const [isOpen, setIsOpen] = useState(false);
    const [dropdown, setDropdown] = useState(false);

    const router = useRouter();

    const pathName = router.pathname;

    const isCategoryPage = pathName === "/category/[slug]";

    const isMd = useMediaQuery(1000);
    const isLgCat = useMediaQuery(1360);

    const navRef = useRef(null);

    const handleHrefClick = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);

        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <>
            <div className={styles.nav}>
                <SvgHamburger
                    isActive={isOpen}
                    className={styles.hamburger}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                />
            </div>
            <NavModal
                ref={navRef}
                isOpen={isOpen}
                className={clsx(styles.dialog, { [styles.open]: isOpen })}
            >
                <div className={styles.modalOverlay}></div>

                <nav className={styles.navigationContainer}>
                    <ul className={styles.list}>
                        {((!isCategoryPage && !isMd) || isLgCat) && (
                            <>
                                {user ? (
                                    <>
                                        <div className={styles.userSection}>
                                            {userData?.name && (
                                                <UserAvatar
                                                    name={userData.name}
                                                    className={styles.avatar}
                                                />
                                            )}
                                            <button
                                                onClick={handleSignOut}
                                                className={styles.authButton}
                                            >
                                                Izloguj se
                                            </button>
                                        </div>
                                        <hr className={styles.line} />
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href="/auth"
                                            className={styles.listItem}
                                        >
                                            <FaUser />
                                            <p className={styles.link}>
                                                Prijavi se
                                            </p>
                                        </Link>
                                        <hr className={styles.line} />
                                    </>
                                )}
                                <Link href={`/`}>
                                    <li className={clsx(styles.listItem)}>
                                        <HiHome />
                                        <p className={styles.link}>Naslovna</p>
                                    </li>
                                </Link>
                                <li
                                    className={clsx(styles.categoriesWrapper)}
                                    onClick={() => setDropdown((prev) => !prev)}
                                >
                                    <span className={clsx(styles.listItem)}>
                                        <GrCatalog />
                                        <p className={styles.link}>
                                            Katalog proizvoda
                                        </p>
                                        <IoMdArrowDropdown
                                            className={`${
                                                styles.dropdownIcon
                                            } ${dropdown && styles.arrowUp}`}
                                        />
                                    </span>

                                    {dropdown && (
                                        <Dropdown
                                            submenus={categories}
                                            dropdown={dropdown}
                                        />
                                    )}
                                </li>
                                <Link href={`/aboutus`}>
                                    <li className={clsx(styles.listItem)}>
                                        <BsFillPeopleFill />
                                        <p className={styles.link}>O nama</p>
                                    </li>
                                </Link>
                                <Link href={`/contact`}>
                                    <li className={clsx(styles.listItem)}>
                                        <MdContactMail />
                                        <p className={styles.link}>Kontakt</p>
                                    </li>
                                </Link>

            {isAdmin && <Link href="/products" className={styles.listItem}><p className={styles.link}>Proizvodi</p></Link>}
            {isAdmin && <Link href="/users" className={styles.listItem}><p className={styles.link}>Korisnici</p></Link>}
                                {isAdmin && (
                                    <Link href="/orders">
                                        <li className={clsx(styles.listItem)}>
                                            <MdContactMail />
                                            <p className={styles.link}>
                                                Porudžbine
                                            </p>
                                        </li>
                                    </Link>
                                )}
                                <hr className={styles.line} />
                            </>
                        )}

                        {showCatalogExport && (
                            <li className={clsx(styles.listItem)}>
                                <CatalogExportButton
                                    categories={categories || []}
                                    menu
                                />
                            </li>
                        )}

                        {isCategoryPage &&
                            category?.categoryProducts?.map(
                                ({ title, image }) => (
                                    <li
                                        key={title}
                                        className={clsx(styles.listItem)}
                                    >
                                        <a
                                            href={`#${title}`}
                                            className={styles.link}
                                        >
                                            {image ? (
                                                <img
                                                    src={image}
                                                    alt={title}
                                                    className={
                                                        styles.sideBarImage
                                                    }
                                                    onClick={(e) =>
                                                        handleHrefClick(
                                                            e,
                                                            title
                                                        )
                                                    }
                                                />
                                            ) : (
                                                <img
                                                    src={"/images/generic.png"}
                                                    alt={title}
                                                    className={
                                                        styles.sideBarImage
                                                    }
                                                    onClick={(e) =>
                                                        handleHrefClick(
                                                            e,
                                                            title
                                                        )
                                                    }
                                                />
                                            )}
                                            {title && (
                                                <p
                                                    onClick={(e) =>
                                                        handleHrefClick(
                                                            e,
                                                            title
                                                        )
                                                    }
                                                >
                                                    {" "}
                                                    {title}
                                                </p>
                                            )}
                                        </a>
                                    </li>
                                )
                            )}
                    </ul>
                </nav>
            </NavModal>
        </>
    );
}
export default NavigationMobile;
